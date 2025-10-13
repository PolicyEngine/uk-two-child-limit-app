from policyengine_uk import Microsimulation, Scenario
import pandas as pd
import numpy as np

dataset = "hf://policyengine/policyengine-uk-data/enhanced_frs_2023_24.h5"

# Analysis for 2026 only
year = 2026

print(f"\n{'='*60}")
print(f"ANALYSIS FOR {year}")
print(f"Exempting Children Under Five from Two-Child Limit")
print(f"{'='*60}")

# Create baseline microsimulation (status quo with two-child limit)
baseline = Microsimulation(dataset=dataset)

# Create reformed scenario (remove two-child limit for children under 5)
# Note: PolicyEngine UK may not have a direct parameter for age-based exemptions
# This creates a full removal scenario for comparison
# You may need to adjust this based on available parameters
scenario_full_reform = Scenario(parameter_changes={
    "gov.dwp.universal_credit.elements.child.limit.child_count": {
        str(year): np.inf
    },
    "gov.dwp.tax_credits.child_tax_credit.limit.child_count": {
        str(year): np.inf
    }
})
reformed_full = Microsimulation(dataset=dataset, scenario=scenario_full_reform)

# Load variables - ADDED 'age' to identify children under 5
vars_to_analyze = [
    'person_id',
    'household_id',
    'benunit_id',
    'is_child',
    'age',  # ADDED: to identify children under 5
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

# Identify children under 5
children_under_5 = children_df[children_df['age'] < 5].copy()
total_children_under_5 = children_under_5['person_weight'].sum()

# UC affected children (all)
uc_affected_children = children_df[children_df['uc_is_child_limit_affected'] > 0]
uc_affected_count = uc_affected_children['person_weight'].sum()

# UC affected children UNDER 5
uc_affected_under_5 = children_under_5[children_under_5['uc_is_child_limit_affected'] > 0]
uc_affected_under_5_count = uc_affected_under_5['person_weight'].sum()

# CTC affected children (need to map benunit-level variable to children)
benunit_ctc = baseline_df.groupby('benunit_id').agg({
    'ctc_child_limit_affected': 'first',
}).reset_index()

children_with_ctc = children_df.merge(
    benunit_ctc,
    on='benunit_id',
    how='left',
    suffixes=('', '_benunit')
)

ctc_affected_children = children_with_ctc[children_with_ctc['ctc_child_limit_affected_benunit'] == True]
ctc_affected_children_count = ctc_affected_children['person_weight'].sum()

# CTC affected children UNDER 5
children_under_5_with_ctc = children_under_5.merge(
    benunit_ctc,
    on='benunit_id',
    how='left',
    suffixes=('', '_benunit')
)
ctc_affected_under_5 = children_under_5_with_ctc[children_under_5_with_ctc['ctc_child_limit_affected_benunit'] == True]
ctc_affected_under_5_count = ctc_affected_under_5['person_weight'].sum()

print("\n=== Children Under Five Analysis ===")
print(f"Total children (weighted): {total_children:,.0f}")
print(f"Children under 5 (weighted): {total_children_under_5:,.0f}")
print(f"Percentage under 5: {100 * total_children_under_5 / total_children:.2f}%")

print("\n=== Universal Credit Child Limit - Under Five Impact ===")
print(f"Total children affected by UC limit: {uc_affected_count:,.0f}")
print(f"Children under 5 affected by UC limit: {uc_affected_under_5_count:,.0f}")
print(f"Percentage of affected children who are under 5: {100 * uc_affected_under_5_count / uc_affected_count:.2f}%")
print(f"Percentage of all under-5s affected: {100 * uc_affected_under_5_count / total_children_under_5:.2f}%")

print("\n=== Child Tax Credit Child Limit - Under Five Impact ===")
print(f"Total children affected by CTC limit: {ctc_affected_children_count:,.0f}")
print(f"Children under 5 affected by CTC limit: {ctc_affected_under_5_count:,.0f}")
print(f"Percentage of affected children who are under 5: {100 * ctc_affected_under_5_count / ctc_affected_children_count:.2f}%")
print(f"Percentage of all under-5s affected: {100 * ctc_affected_under_5_count / total_children_under_5:.2f}%")

# ===== FAMILIES WITH UNDER-FIVES ANALYSIS =====
# Identify benunits with at least one child under 5
benunits_with_under_5 = children_under_5['benunit_id'].unique()

benunit_df = baseline_df.groupby('benunit_id').agg({
    'ctc_child_limit_affected': 'first',
    'household_weight': 'first',
    'child_tax_credit': 'first',
    'universal_credit': 'first',
}).reset_index()

benunit_df['has_child_under_5'] = benunit_df['benunit_id'].isin(benunits_with_under_5)

# UC affected families with under-fives
uc_affected_benunits = baseline_df[baseline_df['uc_is_child_limit_affected'] > 0]['benunit_id'].unique()
uc_affected_families_df = benunit_df[benunit_df['benunit_id'].isin(uc_affected_benunits)]
uc_affected_families_count = uc_affected_families_df['household_weight'].sum()

uc_affected_with_under_5 = uc_affected_families_df[uc_affected_families_df['has_child_under_5'] == True]
uc_affected_with_under_5_count = uc_affected_with_under_5['household_weight'].sum()

# CTC affected families with under-fives
ctc_affected_families = benunit_df[benunit_df['ctc_child_limit_affected'] == True]
ctc_affected_families_count = ctc_affected_families['household_weight'].sum()

ctc_affected_with_under_5 = ctc_affected_families[ctc_affected_families['has_child_under_5'] == True]
ctc_affected_with_under_5_count = ctc_affected_with_under_5['household_weight'].sum()

print("\n=== Families Affected by Child Limit with Children Under Five ===")
print(f"UC affected families (total): {uc_affected_families_count:,.0f}")
print(f"UC affected families with at least one child under 5: {uc_affected_with_under_5_count:,.0f}")
print(f"Percentage: {100 * uc_affected_with_under_5_count / uc_affected_families_count:.2f}%")

print(f"\nCTC affected families (total): {ctc_affected_families_count:,.0f}")
print(f"CTC affected families with at least one child under 5: {ctc_affected_with_under_5_count:,.0f}")
print(f"Percentage: {100 * ctc_affected_with_under_5_count / ctc_affected_families_count:.2f}%")

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

# ===== ESTIMATED COST FOR UNDER-FIVE EXEMPTION =====
print("\n=== Estimated Cost for Under-Five Exemption ===")
# This is a rough estimate based on the proportion of affected children under 5
# The actual cost would require implementing the specific policy in PolicyEngine
proportion_under_5 = uc_affected_under_5_count / uc_affected_count if uc_affected_count > 0 else 0
estimated_cost_under_5 = total_cost * proportion_under_5

print(f"Estimated cost (based on proportion of affected children under 5): £{estimated_cost_under_5/1e9:.2f}bn")
print(f"This is approximately {100 * proportion_under_5:.1f}% of the full reform cost")
print("\nNote: This is a rough estimate. Actual cost would require detailed policy modeling.")

print("\n" + "="*60)
print("ANALYSIS COMPLETE")
print("="*60)
