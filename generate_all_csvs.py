from policyengine_uk import Microsimulation, Scenario
import pandas as pd
import numpy as np
import os

dataset = "hf://policyengine/policyengine-uk-data/enhanced_frs_2023_24.h5"

# Create data directory if it doesn't exist
os.makedirs("public/data", exist_ok=True)

# Years to analyze (for testing, using only 2026)
years = [2026]  # Change to [2026, 2027, 2028, 2029] for full generation

def save_csv(filename, data_dict):
    """Save data dictionary to CSV file"""
    df = pd.DataFrame(list(data_dict.items()), columns=['metric', 'value'])
    df.to_csv(filename, index=False)
    print(f"Saved: {filename}")

def generate_distributional_analysis(baseline, reformed, year, filename):
    """Generate and save distributional analysis for any policy reform"""
    baseline_income_hh = baseline.calculate("household_net_income", year)
    reformed_income_hh = reformed.calculate("household_net_income", year)
    household_weight_hh = baseline.calculate("household_weight", year)
    income_decile_hh = baseline.calculate("household_income_decile", year)

    dist_df = pd.DataFrame({
        'baseline_income': baseline_income_hh,
        'reformed_income': reformed_income_hh,
        'household_weight': household_weight_hh,
        'income_decile': income_decile_hh
    })

    dist_df['income_change'] = dist_df['reformed_income'] - dist_df['baseline_income']

    # Clean decile variable (ensure numeric, 1-10)
    dist_df['income_decile'] = pd.to_numeric(dist_df['income_decile'], errors='coerce').clip(1, 10).astype(int)

    # Calculate weighted average change by decile
    decile_summary = (
        dist_df.groupby('income_decile', observed=True)
        .apply(lambda g: (g['income_change'] * g['household_weight']).sum() / g['household_weight'].sum())
        .reset_index(name='avg_change')
        .sort_values('income_decile')
    )

    # Calculate relative change by decile
    decile_relative = (
        dist_df.groupby('income_decile', observed=True)
        .apply(lambda g: (g['income_change'] * g['household_weight']).sum() /
                         (g['baseline_income'] * g['household_weight']).sum())
        .reset_index(name='relative_change')
        .sort_values('income_decile')
    )

    # Merge absolute and relative changes
    decile_analysis_data = decile_summary.merge(decile_relative, on='income_decile')

    # Save distributional analysis data
    dist_output = []
    for _, row in decile_analysis_data.iterrows():
        dist_output.append({
            'decile': int(row['income_decile']),
            'relative_change_pct': row['relative_change'] * 100
        })

    dist_df_output = pd.DataFrame(dist_output)
    dist_df_output.to_csv(filename, index=False)
    print(f"Saved: {filename}")

for year in years:
    print(f"\n{'='*60}")
    print(f"GENERATING CSV FILES FOR {year}")
    print(f"{'='*60}")

    # Create baseline microsimulation
    baseline = Microsimulation(dataset=dataset)

    # ===== 1. FULL ABOLITION =====
    print(f"\n1. Full Abolition - {year}")
    scenario_full = Scenario(parameter_changes={
        "gov.dwp.universal_credit.elements.child.limit.child_count": {
            str(year): np.inf
        },
        "gov.dwp.tax_credits.child_tax_credit.limit.child_count": {
            str(year): np.inf
        }
    })
    reformed_full = Microsimulation(dataset=dataset, scenario=scenario_full)

    # Calculate metrics
    baseline_income = baseline.calculate("household_net_income", year)
    reformed_income = reformed_full.calculate("household_net_income", year)
    cost = (reformed_income - baseline_income).sum()

    baseline_in_poverty = baseline.calculate("in_poverty", year, map_to="person").values
    reformed_in_poverty = reformed_full.calculate("in_poverty", year, map_to="person").values
    person_weights = baseline.calculate("person_weight", year, map_to="person").values
    is_child = baseline.calculate("is_child", year, map_to="person").values

    child_weights = person_weights * is_child
    baseline_child_poverty = (baseline_in_poverty * child_weights).sum() / child_weights.sum()
    reformed_child_poverty = (reformed_in_poverty * child_weights).sum() / child_weights.sum()
    children_out_of_poverty = (baseline_in_poverty * is_child * person_weights).sum() - (reformed_in_poverty * is_child * person_weights).sum()

    # Get affected families and children
    uc_affected = baseline.calculate("uc_is_child_limit_affected", year, map_to="person").values
    benunit_id = baseline.calculate("benunit_id", year, map_to="person").values
    household_weight = baseline.calculate("household_weight", year, map_to="person").values

    baseline_data_df = pd.DataFrame({
        'is_child': is_child,
        'uc_affected': uc_affected,
        'person_weight': person_weights,
        'benunit_id': benunit_id,
        'household_weight': household_weight
    })

    children_affected = baseline_data_df[baseline_data_df['uc_affected'] > 0]
    total_affected_children = children_affected['person_weight'].sum()

    # Count affected families
    affected_benunits = children_affected['benunit_id'].unique()
    affected_families = baseline_data_df[baseline_data_df['benunit_id'].isin(affected_benunits)]['household_weight'].sum()

    total_children = child_weights.sum()

    data = {
        'cost': cost,
        'fullReformCost': cost,
        'familiesAffected': affected_families,
        'totalAffectedFamilies': affected_families,
        'childrenNoLongerLimited': total_affected_children,
        'totalLimitedChildren': total_affected_children,
        'childrenOutOfPoverty': children_out_of_poverty,
        'baselinePovertyRate': baseline_child_poverty,
        'reformedPovertyRate': reformed_child_poverty,
        'povertyRateReduction': baseline_child_poverty - reformed_child_poverty,
        'costPerChild': cost / total_affected_children if total_affected_children > 0 else 0,
        'totalChildren': total_children,
    }

    save_csv(f"public/data/full-abolition-{year}.csv", data)

    # ===== DISTRIBUTIONAL ANALYSIS FOR FULL ABOLITION =====
    print(f"\n1b. Distributional Analysis - Full Abolition - {year}")
    generate_distributional_analysis(baseline, reformed_full, year, f"public/data/distributional-analysis-full-abolition-{year}.csv")

    # ===== 2. THREE-CHILD LIMIT (for different child limits 3-16) =====
    print(f"\n2. Three-Child Limit - {year}")

    # Count families by size for policy-specific data
    children_per_benunit = baseline_data_df[baseline_data_df['is_child'] == True].groupby('benunit_id').size().reset_index(name='num_children')
    affected_family_sizes = children_per_benunit[children_per_benunit['benunit_id'].isin(affected_benunits)]

    # Generate data for child limit 3 only (for testing)
    for child_limit in [3]:  # Change to range(3, 17) for full generation
        print(f"  Generating for child limit: {child_limit}")

        scenario_limit = Scenario(parameter_changes={
            "gov.dwp.universal_credit.elements.child.limit.child_count": {
                str(year): child_limit
            },
            "gov.dwp.tax_credits.child_tax_credit.limit.child_count": {
                str(year): child_limit
            }
        })
        reformed_limit = Microsimulation(dataset=dataset, scenario=scenario_limit)

        reformed_limit_income = reformed_limit.calculate("household_net_income", year)
        cost_limit = (reformed_limit_income - baseline_income).sum()

        reformed_limit_poverty = reformed_limit.calculate("in_poverty", year, map_to="person").values
        reformed_limit_child_poverty = (reformed_limit_poverty * child_weights).sum() / child_weights.sum()
        children_out_limit = (baseline_in_poverty * is_child * person_weights).sum() - (reformed_limit_poverty * is_child * person_weights).sum()

        # Count families that would be fully helped vs partially helped
        families_at_limit = len(affected_family_sizes[affected_family_sizes['num_children'] == child_limit])
        families_above_limit = len(affected_family_sizes[affected_family_sizes['num_children'] > child_limit])

        data = {
            'cost': cost_limit,
            'fullReformCost': cost,
            'familiesAffected': affected_families,
            'totalAffectedFamilies': affected_families,
            'childrenNoLongerLimited': children_out_limit,
            'totalLimitedChildren': total_affected_children,
            'childrenOutOfPoverty': children_out_limit,
            'baselinePovertyRate': baseline_child_poverty,
            'reformedPovertyRate': reformed_limit_child_poverty,
            'povertyRateReduction': baseline_child_poverty - reformed_limit_child_poverty,
            'costPerChild': cost_limit / children_out_limit if children_out_limit > 0 else 0,
            'childLimit': child_limit,
            'familiesAtLimit': families_at_limit,
            'familiesAboveLimit': families_above_limit,
        }

        save_csv(f"public/data/three-child-limit-{year}-limit{child_limit}.csv", data)

        # Generate distributional analysis for this policy
        print(f"  Generating distributional analysis for child limit: {child_limit}")
        generate_distributional_analysis(baseline, reformed_limit, year, f"public/data/distributional-analysis-three-child-limit-{year}-limit{child_limit}.csv")

    # ===== 3. UNDER-FIVE EXEMPTION (for different age limits 3-16) =====
    print(f"\n3. Under-Five Exemption - {year}")
    age = baseline.calculate("age", year, map_to="person").values
    baseline_data_df['age'] = age

    # Generate data for age limit 3 only (for testing)
    for age_limit in [3]:  # Change to range(3, 17) for full generation
        print(f"  Generating for age limit: {age_limit}")

        children_under_age = baseline_data_df.copy()
        children_under_age_affected = children_under_age[(children_under_age['is_child'] == True) &
                                                         (children_under_age['age'] < age_limit) &
                                                         (children_under_age['uc_affected'] > 0)]

        affected_under_age_count = children_under_age_affected['person_weight'].sum()
        total_under_age = children_under_age[(children_under_age['is_child'] == True) & (children_under_age['age'] < age_limit)]['person_weight'].sum()

        # Estimate cost proportionally
        cost_under_age = cost * (affected_under_age_count / total_affected_children) if total_affected_children > 0 else 0
        children_out_under_age = children_out_of_poverty * (affected_under_age_count / total_affected_children) if total_affected_children > 0 else 0

        data = {
            'cost': cost_under_age,
            'fullReformCost': cost,
            'familiesAffected': affected_families * (affected_under_age_count / total_affected_children) if total_affected_children > 0 else 0,
            'totalAffectedFamilies': affected_families,
            'childrenNoLongerLimited': affected_under_age_count,
            'totalLimitedChildren': total_affected_children,
            'childrenOutOfPoverty': children_out_under_age,
            'baselinePovertyRate': baseline_child_poverty,
            'reformedPovertyRate': baseline_child_poverty - (children_out_under_age / total_children),
            'povertyRateReduction': children_out_under_age / total_children,
            'costPerChild': cost_under_age / affected_under_age_count if affected_under_age_count > 0 else 0,
            'ageLimit': age_limit,
            'totalChildrenUnderAge': total_under_age,
            'affectedChildrenUnderAge': affected_under_age_count,
        }

        save_csv(f"public/data/under-five-exemption-{year}-age{age_limit}.csv", data)

    # ===== 4. DISABLED CHILD EXEMPTION =====
    print(f"\n4. Disabled Child Exemption - {year}")
    cost_disabled = cost * 0.15
    children_out_disabled = children_out_of_poverty * 0.15

    data = {
        'cost': cost_disabled,
        'fullReformCost': cost,
        'familiesAffected': affected_families * 0.15,
        'totalAffectedFamilies': affected_families,
        'childrenNoLongerLimited': total_affected_children * 0.15,
        'totalLimitedChildren': total_affected_children,
        'childrenOutOfPoverty': children_out_disabled,
        'baselinePovertyRate': baseline_child_poverty,
        'reformedPovertyRate': baseline_child_poverty - (children_out_disabled / total_children),
        'povertyRateReduction': children_out_disabled / total_children,
        'costPerChild': cost_disabled / (total_affected_children * 0.15),
        'disabledChildren': total_children * 0.05,
        'familiesWithDisabledChild': affected_families * 0.15,
        'publishedCost': 1200000000,
        'publishedChildrenOutOfPoverty': 120000,
    }

    save_csv(f"public/data/disabled-child-exemption-{year}.csv", data)

    # Note: Distributional analysis for disabled child exemption requires actual simulation
    # Currently this policy uses proportional estimates, so we skip distributional analysis

    # ===== 5. WORKING FAMILIES EXEMPTION =====
    print(f"\n5. Working Families Exemption - {year}")
    employment_income = baseline.calculate("employment_income", year, map_to="person").values
    baseline_data_df['employment_income'] = employment_income

    working_benunits = baseline_data_df[baseline_data_df['employment_income'] > 0]['benunit_id'].unique()
    affected_working_benunits = set(affected_benunits).intersection(set(working_benunits))

    working_families_count = len(affected_working_benunits)
    total_affected_count = len(affected_benunits)
    pct_working = working_families_count / total_affected_count if total_affected_count > 0 else 0

    cost_working = cost * pct_working
    children_out_working = children_out_of_poverty * pct_working

    data = {
        'cost': cost_working,
        'fullReformCost': cost,
        'familiesAffected': working_families_count,
        'totalAffectedFamilies': affected_families,
        'childrenNoLongerLimited': total_affected_children * pct_working,
        'totalLimitedChildren': total_affected_children,
        'childrenOutOfPoverty': children_out_working,
        'baselinePovertyRate': baseline_child_poverty,
        'reformedPovertyRate': baseline_child_poverty - (children_out_working / total_children),
        'povertyRateReduction': children_out_working / total_children,
        'costPerChild': cost_working / (total_affected_children * pct_working) if pct_working > 0 else 0,
        'workingFamilies': working_families_count,
        'nonWorkingFamilies': total_affected_count - working_families_count,
    }

    save_csv(f"public/data/working-families-exemption-{year}.csv", data)

    # Note: Distributional analysis for working families exemption requires actual simulation
    # Currently this policy uses proportional estimates, so we skip distributional analysis

    # ===== 6. LOWER THIRD+ CHILD ELEMENT (for different reduction rates 50%-100%) =====
    print(f"\n6. Lower Third+ Child Element - {year}")

    # Generate data for 50% reduction rate only (for testing)
    for rate_pct in [50]:  # Change to range(50, 105, 10) for full generation
        reduction_rate = rate_pct / 100.0
        print(f"  Generating for reduction rate: {rate_pct}%")

        cost_reduced = cost * reduction_rate
        children_out_reduced = children_out_of_poverty * reduction_rate

        data = {
            'cost': cost_reduced,
            'fullReformCost': cost,
            'familiesAffected': affected_families,
            'totalAffectedFamilies': affected_families,
            'childrenNoLongerLimited': total_affected_children,
            'totalLimitedChildren': total_affected_children,
            'childrenOutOfPoverty': children_out_reduced,
            'baselinePovertyRate': baseline_child_poverty,
            'reformedPovertyRate': baseline_child_poverty - (children_out_reduced / total_children),
            'povertyRateReduction': children_out_reduced / total_children,
            'costPerChild': cost_reduced / total_affected_children if total_affected_children > 0 else 0,
            'reductionRate': reduction_rate,
            'standardElement': 3626,
            'reducedElement': int(3626 * reduction_rate),
            'thirdPlusChildren': total_affected_children,
        }

        save_csv(f"public/data/lower-third-child-element-{year}-rate{rate_pct}.csv", data)

        # Note: Distributional analysis for lower third child element requires actual simulation
        # Currently this policy uses proportional estimates, so we skip distributional analysis

print("\n" + "="*60)
print("ALL CSV FILES GENERATED")
print("="*60)

# ===== COMBINE ALL CSVs INTO ONE COMPREHENSIVE FILE =====
print("\n" + "="*60)
print("CREATING COMPREHENSIVE CSV FILE")
print("="*60)

all_data = []

for year in years:
    # Handle policies without parameters
    for policy in ['full-abolition', 'disabled-child-exemption', 'working-families-exemption']:
        csv_file = f"public/data/{policy}-{year}.csv"
        if os.path.exists(csv_file):
            df = pd.read_csv(csv_file)
            for _, row in df.iterrows():
                all_data.append({
                    'year': year,
                    'policy': policy,
                    'parameter': None,
                    'metric': row['metric'],
                    'value': row['value']
                })

    # Handle three-child-limit with different child limit values
    for child_limit in [3]:  # Change to range(3, 17) for full generation
        csv_file = f"public/data/three-child-limit-{year}-limit{child_limit}.csv"
        if os.path.exists(csv_file):
            df = pd.read_csv(csv_file)
            for _, row in df.iterrows():
                all_data.append({
                    'year': year,
                    'policy': 'three-child-limit',
                    'parameter': child_limit,
                    'metric': row['metric'],
                    'value': row['value']
                })

    # Handle under-five-exemption with different age limits
    for age_limit in [3]:  # Change to range(3, 17) for full generation
        csv_file = f"public/data/under-five-exemption-{year}-age{age_limit}.csv"
        if os.path.exists(csv_file):
            df = pd.read_csv(csv_file)
            for _, row in df.iterrows():
                all_data.append({
                    'year': year,
                    'policy': 'under-five-exemption',
                    'parameter': age_limit,
                    'metric': row['metric'],
                    'value': row['value']
                })

    # Handle lower-third-child-element with different reduction rates
    for rate_pct in [50]:  # Change to range(50, 105, 10) for full generation
        csv_file = f"public/data/lower-third-child-element-{year}-rate{rate_pct}.csv"
        if os.path.exists(csv_file):
            df = pd.read_csv(csv_file)
            for _, row in df.iterrows():
                all_data.append({
                    'year': year,
                    'policy': 'lower-third-child-element',
                    'parameter': rate_pct,
                    'metric': row['metric'],
                    'value': row['value']
                })

# Create comprehensive CSV
comprehensive_df = pd.DataFrame(all_data)
comprehensive_df.to_csv('public/data/all-results.csv', index=False)
print("Saved: public/data/all-results.csv")

print("\n" + "="*60)
print("COMPREHENSIVE CSV FILE CREATED")
print(f"Total rows: {len(comprehensive_df)}")
print("="*60)
