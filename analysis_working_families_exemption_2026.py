from policyengine_uk import Microsimulation, Scenario
import pandas as pd
import numpy as np

dataset = "hf://policyengine/policyengine-uk-data/enhanced_frs_2023_24.h5"

# Analysis for 2026 only
year = 2026

print(f"\n{'='*60}")
print(f"ANALYSIS FOR {year}")
print(f"Exempting Working Families from Two-Child Limit")
print(f"(Applying limit only to out-of-work families)")
print(f"{'='*60}")

# Create baseline microsimulation (status quo with two-child limit)
baseline = Microsimulation(dataset=dataset)

# Create reformed scenario (full removal for comparison)
scenario_full_reform = Scenario(parameter_changes={
    "gov.dwp.universal_credit.elements.child.limit.child_count": {
        str(year): np.inf
    },
    "gov.dwp.tax_credits.child_tax_credit.limit.child_count": {
        str(year): np.inf
    }
})
reformed_full = Microsimulation(dataset=dataset, scenario=scenario_full_reform)

# Load variables - ADDED employment-related variables
vars_to_analyze = [
    'person_id',
    'household_id',
    'benunit_id',
    'is_child',
    'is_adult',  # ADDED: to identify adults
    'employment_status',  # ADDED: employment status enum
    'employment_income',  # ADDED: employment income
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

# ===== WORKING FAMILIES ANALYSIS =====
# Identify adults who are working (employment_income > 0 or employment_status indicates employed)
adults_df = baseline_df[baseline_df['is_adult'] == True].copy()
adults_df['is_working'] = adults_df['employment_income'] > 0

print("\n=== Adult Employment Analysis ===")
total_adults = adults_df['person_weight'].sum()
working_adults = adults_df[adults_df['is_working'] == True]
total_working_adults = working_adults['person_weight'].sum()

print(f"Total adults (weighted): {total_adults:,.0f}")
print(f"Working adults (employment income > 0): {total_working_adults:,.0f}")
print(f"Percentage of adults working: {100 * total_working_adults / total_adults:.2f}%")

# Identify benunits with at least one working adult
benunits_with_working_adult = adults_df[adults_df['is_working'] == True]['benunit_id'].unique()
print(f"\nBenunits with at least one working adult: {len(benunits_with_working_adult):,}")

# ===== UC AFFECTED FAMILIES - WORKING STATUS =====
children_df = baseline_df[baseline_df['is_child'] == True].copy()
total_children = children_df['person_weight'].sum()

# Get UC affected families
uc_affected_children = children_df[children_df['uc_is_child_limit_affected'] > 0]
uc_affected_count = uc_affected_children['person_weight'].sum()

uc_affected_benunits = baseline_df[baseline_df['uc_is_child_limit_affected'] > 0]['benunit_id'].unique()

benunit_df = baseline_df.groupby('benunit_id').agg({
    'ctc_child_limit_affected': 'first',
    'household_weight': 'first',
    'child_tax_credit': 'first',
    'universal_credit': 'first',
}).reset_index()

benunit_df['has_working_adult'] = benunit_df['benunit_id'].isin(benunits_with_working_adult)

# UC affected families
uc_affected_families_df = benunit_df[benunit_df['benunit_id'].isin(uc_affected_benunits)]
uc_affected_families_count = uc_affected_families_df['household_weight'].sum()

# Split by working status
uc_affected_working = uc_affected_families_df[uc_affected_families_df['has_working_adult'] == True]
uc_affected_working_count = uc_affected_working['household_weight'].sum()

uc_affected_not_working = uc_affected_families_df[uc_affected_families_df['has_working_adult'] == False]
uc_affected_not_working_count = uc_affected_not_working['household_weight'].sum()

print("\n=== UC Affected Families by Work Status ===")
print(f"Total UC affected families: {uc_affected_families_count:,.0f}")
print(f"UC affected families with working adult: {uc_affected_working_count:,.0f} ({100 * uc_affected_working_count / uc_affected_families_count:.2f}%)")
print(f"UC affected families without working adult: {uc_affected_not_working_count:,.0f} ({100 * uc_affected_not_working_count / uc_affected_families_count:.2f}%)")

# ===== CTC AFFECTED FAMILIES - WORKING STATUS =====
ctc_affected_families = benunit_df[benunit_df['ctc_child_limit_affected'] == True]
ctc_affected_families_count = ctc_affected_families['household_weight'].sum()

ctc_affected_working = ctc_affected_families[ctc_affected_families['has_working_adult'] == True]
ctc_affected_working_count = ctc_affected_working['household_weight'].sum()

ctc_affected_not_working = ctc_affected_families[ctc_affected_families['has_working_adult'] == False]
ctc_affected_not_working_count = ctc_affected_not_working['household_weight'].sum()

print("\n=== CTC Affected Families by Work Status ===")
print(f"Total CTC affected families: {ctc_affected_families_count:,.0f}")
print(f"CTC affected families with working adult: {ctc_affected_working_count:,.0f} ({100 * ctc_affected_working_count / ctc_affected_families_count:.2f}%)")
print(f"CTC affected families without working adult: {ctc_affected_not_working_count:,.0f} ({100 * ctc_affected_not_working_count / ctc_affected_families_count:.2f}%)")

# ===== CHILDREN IN WORKING VS NON-WORKING AFFECTED FAMILIES =====
# Get all children in affected families and their working status
all_children_in_uc_affected = children_df[children_df['benunit_id'].isin(uc_affected_benunits)].copy()
all_children_in_uc_affected['benunit_has_working_adult'] = all_children_in_uc_affected['benunit_id'].isin(benunits_with_working_adult)

children_in_working_families = all_children_in_uc_affected[all_children_in_uc_affected['benunit_has_working_adult'] == True]
children_in_not_working_families = all_children_in_uc_affected[all_children_in_uc_affected['benunit_has_working_adult'] == False]

# Children currently limited
children_limited_working_families = children_in_working_families[children_in_working_families['uc_is_child_limit_affected'] > 0]
children_limited_not_working_families = children_in_not_working_families[children_in_not_working_families['uc_is_child_limit_affected'] > 0]

print("\n=== Children in UC Affected Families by Work Status ===")
print(f"Total children in UC affected families: {all_children_in_uc_affected['person_weight'].sum():,.0f}")
print(f"Children in working families: {children_in_working_families['person_weight'].sum():,.0f}")
print(f"Children in non-working families: {children_in_not_working_families['person_weight'].sum():,.0f}")

print(f"\nChildren currently limited in working families: {children_limited_working_families['person_weight'].sum():,.0f}")
print(f"Children currently limited in non-working families: {children_limited_not_working_families['person_weight'].sum():,.0f}")

print(f"\n*** POLICY IMPACT ***")
print(f"Exempting working families would remove the limit for:")
print(f"  - {uc_affected_working_count:,.0f} families")
print(f"  - {children_limited_working_families['person_weight'].sum():,.0f} children")

# ===== POVERTY IMPACT - FULL REFORM FOR COMPARISON =====
print("\n=== Poverty Impact (Full Reform - for comparison) ===")
baseline_in_poverty = baseline.calculate("in_poverty", year, map_to="person").values
reformed_in_poverty = reformed_full.calculate("in_poverty", year, map_to="person").values
person_weights = baseline.calculate("person_weight", year, map_to="person").values
is_child = baseline.calculate("is_child", year, map_to="person").values

# Child poverty rates
child_weights = person_weights * is_child
baseline_child_poverty_rate = (baseline_in_poverty * child_weights).sum() / child_weights.sum()
reformed_child_poverty_rate = (reformed_in_poverty * child_weights).sum() / child_weights.sum()
child_poverty_rate_reduction = baseline_child_poverty_rate - reformed_child_poverty_rate

children_out_of_poverty = (baseline_in_poverty * is_child * person_weights).sum() - (reformed_in_poverty * is_child * person_weights).sum()

print(f"Child poverty rate (baseline): {baseline_child_poverty_rate:.2%}")
print(f"Child poverty rate (full reform): {reformed_child_poverty_rate:.2%}")
print(f"Child poverty rate reduction: {child_poverty_rate_reduction:.2%}")
print(f"Children lifted out of poverty: {children_out_of_poverty:,.0f}")

# ===== COST ANALYSIS - FULL REFORM =====
print("\n=== Cost Analysis (Full Reform - for comparison) ===")
baseline_income = baseline.calculate("household_net_income", year)
reformed_income = reformed_full.calculate("household_net_income", year)
difference_income = reformed_income - baseline_income
total_cost = difference_income.sum()

print(f"Total cost of removing two-child limit (full reform): £{total_cost/1e9:.2f}bn")

# ===== ESTIMATED COST FOR WORKING FAMILIES EXEMPTION =====
print("\n=== Estimated Cost for Working Families Exemption ===")
# Estimate based on proportion of affected families with working adults
proportion_working = uc_affected_working_count / uc_affected_families_count if uc_affected_families_count > 0 else 0
estimated_cost_working = total_cost * proportion_working

print(f"Estimated cost (based on proportion of affected families with working adults): £{estimated_cost_working/1e9:.2f}bn")
print(f"This is approximately {100 * proportion_working:.1f}% of the full reform cost")
print(f"\nNumber of working families that would benefit: {uc_affected_working_count:,.0f}")
print(f"Number of children who would no longer be limited: {children_limited_working_families['person_weight'].sum():,.0f}")

# Remaining families (out-of-work)
print(f"\n=== Families That Would Still Be Affected ===")
print(f"Out-of-work families still subject to limit: {uc_affected_not_working_count:,.0f}")
print(f"Children still limited in out-of-work families: {children_limited_not_working_families['person_weight'].sum():,.0f}")
print(f"This is {100 * uc_affected_not_working_count / uc_affected_families_count:.1f}% of currently affected families")

# Sample size
uc_affected_benunits_unweighted = len(uc_affected_benunits)
working_affected_unweighted = len(set(uc_affected_benunits) & set(benunits_with_working_adult))
not_working_affected_unweighted = uc_affected_benunits_unweighted - working_affected_unweighted

print(f"\n=== Sample Size ===")
print(f"Unweighted UC affected families: {uc_affected_benunits_unweighted}")
print(f"  - With working adult: {working_affected_unweighted}")
print(f"  - Without working adult: {not_working_affected_unweighted}")

print("\n*** POLICY INTERPRETATION ***")
print("This policy would exempt families from the two-child limit if at least one adult")
print("has employment income. The limit would only apply to out-of-work families.")
print(f"\nKey trade-off:")
print(f"  - Helps {100 * proportion_working:.1f}% of affected families (those with working adults)")
print(f"  - Costs {100 * proportion_working:.1f}% of full reform cost")
print(f"  - Still leaves {100 * (1-proportion_working):.1f}% of affected families subject to the limit")

print("\nNote: This is a rough estimate using simple proportional scaling.")
print("Actual policy implementation would require detailed microsimulation modeling.")

print("\n" + "="*60)
print("ANALYSIS COMPLETE")
print("="*60)
