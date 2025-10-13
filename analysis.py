from policyengine_uk import Microsimulation, Scenario
import pandas as pd
import numpy as np

dataset = "hf://policyengine/policyengine-uk-data/enhanced_frs_2023_24.h5"

# Years to analyze
years = [2026, 2027, 2028, 2029]

for year in years:
    print(f"\n{'='*60}")
    print(f"ANALYSIS FOR {year}")
    print(f"{'='*60}")

    # Create baseline microsimulation
    baseline = Microsimulation(dataset=dataset)

    # Create reformed scenario (remove two-child limit)
    scenario = Scenario(parameter_changes={
        "gov.dwp.universal_credit.elements.child.limit.child_count": {
            str(year): np.inf
        },
        "gov.dwp.tax_credits.child_tax_credit.limit.child_count": {
            str(year): np.inf
        }
    })
    reformed = Microsimulation(dataset=dataset, scenario=scenario)

    # Load variables
    vars_to_analyze = [
        'person_id',
        'household_id',
        'benunit_id',
        'is_child',
        'uc_is_child_limit_affected',
        'uc_is_child_born_before_child_limit',
        'ctc_child_limit_affected',
        'universal_credit',
        'child_tax_credit',
        'person_weight',
        'household_weight',
    ]

    baseline_data = {}
    for var in vars_to_analyze:
        baseline_data[var] = baseline.calculate(var, year, map_to="person").values

    baseline_df = pd.DataFrame(baseline_data)

    # ===== CHILDREN ANALYSIS =====
    children_df = baseline_df[baseline_df['is_child'] == True].copy()
    total_children = children_df['person_weight'].sum()

    # UC affected children
    uc_affected_children = children_df[children_df['uc_is_child_limit_affected'] > 0]
    uc_affected_count = uc_affected_children['person_weight'].sum()

    # CTC affected children (need to map benunit-level variable to children)
    # Create benunit lookup for CTC affected status
    benunit_ctc = baseline_df.groupby('benunit_id').agg({
        'ctc_child_limit_affected': 'first',
    }).reset_index()

    # Merge back to children
    children_with_ctc = children_df.merge(
        benunit_ctc,
        on='benunit_id',
        how='left',
        suffixes=('', '_benunit')
    )

    ctc_affected_children = children_with_ctc[children_with_ctc['ctc_child_limit_affected_benunit'] == True]
    ctc_affected_children_count = ctc_affected_children['person_weight'].sum()

    # Transitional protection
    born_before_limit = children_df[children_df['uc_is_child_born_before_child_limit'] == True]
    born_before_count = born_before_limit['person_weight'].sum()

    print("\n=== Universal Credit Child Limit ===")
    print(f"Total children (weighted): {total_children:,.0f}")
    print(f"Children affected by UC limit: {uc_affected_count:,.0f}")
    print(f"Percentage affected: {100 * uc_affected_count / total_children:.2f}%")

    print("\n=== Child Tax Credit Child Limit ===")
    print(f"Total children (weighted): {total_children:,.0f}")
    print(f"Children affected by CTC limit: {ctc_affected_children_count:,.0f}")
    print(f"Percentage affected: {100 * ctc_affected_children_count / total_children:.2f}%")

    print("\n=== Transitional Protection ===")
    print(f"Percentage of all children: {100 * born_before_count / total_children:.2f}%")

    # ===== FAMILIES ANALYSIS =====
    benunit_df = baseline_df.groupby('benunit_id').agg({
        'ctc_child_limit_affected': 'first',
        'household_weight': 'first',
        'child_tax_credit': 'first',
        'universal_credit': 'first',
    }).reset_index()

    # UC families
    uc_benunits = benunit_df[benunit_df['universal_credit'] > 0]
    uc_benunit_count = uc_benunits['household_weight'].sum()

    # CTC families
    ctc_benunits = benunit_df[benunit_df['child_tax_credit'] > 0]
    ctc_benunit_count = ctc_benunits['household_weight'].sum()

    # UC affected families
    uc_affected_benunits = baseline_df[baseline_df['uc_is_child_limit_affected'] > 0]['benunit_id'].unique()
    uc_affected_families_df = benunit_df[benunit_df['benunit_id'].isin(uc_affected_benunits)]
    uc_affected_families_count = uc_affected_families_df['household_weight'].sum()

    # CTC affected families
    ctc_affected_families = benunit_df[benunit_df['ctc_child_limit_affected'] == True]
    ctc_affected_families_count = ctc_affected_families['household_weight'].sum()

    print("\n=== Combined UC and CTC Analysis ===")
    print(f"Families receiving Universal Credit: {uc_benunit_count:,.0f}")
    print(f"Families receiving Child Tax Credit: {ctc_benunit_count:,.0f}")
    print(f"\nFamilies affected by UC child limit: {uc_affected_families_count:,.0f}")
    if uc_benunit_count > 0:
        print(f"Percentage of UC families: {100 * uc_affected_families_count / uc_benunit_count:.2f}%")
    print(f"\nFamilies affected by CTC child limit: {ctc_affected_families_count:,.0f}")
    if ctc_benunit_count > 0:
        print(f"Percentage of CTC families: {100 * ctc_affected_families_count / ctc_benunit_count:.2f}%")

    # ===== POVERTY ANALYSIS =====
    # Calculate poverty in baseline and reformed scenarios
    baseline_in_poverty = baseline.calculate("in_poverty", year, map_to="person").values
    reformed_in_poverty = reformed.calculate("in_poverty", year, map_to="person").values
    person_weights = baseline.calculate("person_weight", year, map_to="person").values
    is_child = baseline.calculate("is_child", year, map_to="person").values

    # Overall poverty rates
    baseline_poverty_rate = (baseline_in_poverty * person_weights).sum() / person_weights.sum()
    reformed_poverty_rate = (reformed_in_poverty * person_weights).sum() / person_weights.sum()
    poverty_rate_reduction = baseline_poverty_rate - reformed_poverty_rate

    # Child poverty rates
    child_weights = person_weights * is_child
    baseline_child_poverty_rate = (baseline_in_poverty * child_weights).sum() / child_weights.sum()
    reformed_child_poverty_rate = (reformed_in_poverty * child_weights).sum() / child_weights.sum()
    child_poverty_rate_reduction = baseline_child_poverty_rate - reformed_child_poverty_rate

    # Number of children lifted out of poverty
    children_out_of_poverty = (baseline_in_poverty * is_child * person_weights).sum() - (reformed_in_poverty * is_child * person_weights).sum()

    print("\n=== Poverty Impact ===")
    print(f"Overall poverty rate (baseline): {baseline_poverty_rate:.2%}")
    print(f"Overall poverty rate (reformed): {reformed_poverty_rate:.2%}")
    print(f"Poverty rate reduction: {poverty_rate_reduction:.2%}")

    print(f"\nChild poverty rate (baseline): {baseline_child_poverty_rate:.2%}")
    print(f"Child poverty rate (reformed): {reformed_child_poverty_rate:.2%}")
    print(f"Child poverty rate reduction: {child_poverty_rate_reduction:.2%}")
    print(f"Children lifted out of poverty: {children_out_of_poverty:,.0f}")

    # ===== COST ANALYSIS =====
    baseline_income = baseline.calculate("household_net_income", year)
    reformed_income = reformed.calculate("household_net_income", year)
    difference_income = reformed_income - baseline_income
    total_cost = difference_income.sum()

    print("\n=== Cost Analysis ===")
    print(f"Total cost of removing two-child limit: £{total_cost/1e9:.2f}bn")

print("\n" + "="*60)
print("ANALYSIS COMPLETE")
print("="*60)
