from policyengine_uk import Microsimulation, Scenario
import pandas as pd
import numpy as np

dataset = "hf://policyengine/policyengine-uk-data/enhanced_frs_2023_24.h5"

# Analysis for 2026 only
year = 2026

print(f"\n{'='*60}")
print(f"ANALYSIS FOR {year}")
print(f"Moving from Two-Child Limit to Three-Child Limit")
print(f"{'='*60}")

# Create baseline microsimulation (status quo with two-child limit)
baseline = Microsimulation(dataset=dataset)

# Create reformed scenario (three-child limit instead of two)
scenario_three_child = Scenario(parameter_changes={
    "gov.dwp.universal_credit.elements.child.limit.child_count": {
        str(year): 3  # Changed from 2 to 3
    },
    "gov.dwp.tax_credits.child_tax_credit.limit.child_count": {
        str(year): 3  # Changed from 2 to 3
    }
})
reformed_three_child = Microsimulation(dataset=dataset, scenario=scenario_three_child)

# Also create full reform scenario for comparison
scenario_full_reform = Scenario(parameter_changes={
    "gov.dwp.universal_credit.elements.child.limit.child_count": {
        str(year): np.inf
    },
    "gov.dwp.tax_credits.child_tax_credit.limit.child_count": {
        str(year): np.inf
    }
})
reformed_full = Microsimulation(dataset=dataset, scenario=scenario_full_reform)

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

# ===== BASELINE ANALYSIS =====
children_df = baseline_df[baseline_df['is_child'] == True].copy()
total_children = children_df['person_weight'].sum()

# UC affected children under two-child limit
uc_affected_children = children_df[children_df['uc_is_child_limit_affected'] > 0]
uc_affected_count = uc_affected_children['person_weight'].sum()

# CTC affected children
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

print("\n=== Baseline (Two-Child Limit) ===")
print(f"Total children (weighted): {total_children:,.0f}")
print(f"Children affected by UC two-child limit: {uc_affected_count:,.0f}")
print(f"Children affected by CTC two-child limit: {ctc_affected_children_count:,.0f}")

# ===== FAMILIES ANALYSIS =====
benunit_df = baseline_df.groupby('benunit_id').agg({
    'ctc_child_limit_affected': 'first',
    'household_weight': 'first',
    'child_tax_credit': 'first',
    'universal_credit': 'first',
}).reset_index()

# UC affected families
uc_affected_benunits = baseline_df[baseline_df['uc_is_child_limit_affected'] > 0]['benunit_id'].unique()
uc_affected_families_df = benunit_df[benunit_df['benunit_id'].isin(uc_affected_benunits)]
uc_affected_families_count = uc_affected_families_df['household_weight'].sum()

# CTC affected families
ctc_affected_families = benunit_df[benunit_df['ctc_child_limit_affected'] == True]
ctc_affected_families_count = ctc_affected_families['household_weight'].sum()

print(f"\nFamilies affected by UC two-child limit: {uc_affected_families_count:,.0f}")
print(f"Families affected by CTC two-child limit: {ctc_affected_families_count:,.0f}")

# ===== COUNT CHILDREN PER FAMILY TO UNDERSTAND WHO BENEFITS FROM THREE-CHILD LIMIT =====
# Count children per benunit
children_per_benunit = children_df.groupby('benunit_id').agg({
    'person_weight': 'first',  # Use first child's weight as family weight
    'is_child': 'count'  # Count number of children
}).reset_index()
children_per_benunit.columns = ['benunit_id', 'family_weight', 'num_children']

# Among UC affected families, how many have exactly 3 children vs 4+ children
uc_affected_family_sizes = children_per_benunit[children_per_benunit['benunit_id'].isin(uc_affected_benunits)]

families_with_3_children = uc_affected_family_sizes[uc_affected_family_sizes['num_children'] == 3]
families_with_4plus_children = uc_affected_family_sizes[uc_affected_family_sizes['num_children'] >= 4]

count_3_children = families_with_3_children['family_weight'].sum()
count_4plus_children = families_with_4plus_children['family_weight'].sum()

print(f"\n=== Family Size Analysis (UC Affected Families) ===")
print(f"Families with exactly 3 children: {count_3_children:,.0f}")
print(f"Families with 4+ children: {count_4plus_children:,.0f}")
print(f"Total UC affected families: {uc_affected_families_count:,.0f}")
print(f"\nFamilies with 3 children would be fully helped by three-child limit")
print(f"Families with 4+ children would still be partially affected")

# ===== POVERTY IMPACT - THREE-CHILD LIMIT =====
print("\n=== Poverty Impact (Three-Child Limit) ===")
baseline_in_poverty = baseline.calculate("in_poverty", year, map_to="person").values
reformed_three_in_poverty = reformed_three_child.calculate("in_poverty", year, map_to="person").values
reformed_full_in_poverty = reformed_full.calculate("in_poverty", year, map_to="person").values
person_weights = baseline.calculate("person_weight", year, map_to="person").values
is_child = baseline.calculate("is_child", year, map_to="person").values

# Child poverty rates
child_weights = person_weights * is_child
baseline_child_poverty_rate = (baseline_in_poverty * child_weights).sum() / child_weights.sum()
reformed_three_child_poverty_rate = (reformed_three_in_poverty * child_weights).sum() / child_weights.sum()
reformed_full_child_poverty_rate = (reformed_full_in_poverty * child_weights).sum() / child_weights.sum()

three_child_poverty_reduction = baseline_child_poverty_rate - reformed_three_child_poverty_rate
full_reform_poverty_reduction = baseline_child_poverty_rate - reformed_full_child_poverty_rate

# Number of children lifted out of poverty
children_out_of_poverty_three = (baseline_in_poverty * is_child * person_weights).sum() - (reformed_three_in_poverty * is_child * person_weights).sum()
children_out_of_poverty_full = (baseline_in_poverty * is_child * person_weights).sum() - (reformed_full_in_poverty * is_child * person_weights).sum()

print(f"Child poverty rate (baseline - two-child limit): {baseline_child_poverty_rate:.2%}")
print(f"Child poverty rate (three-child limit): {reformed_three_child_poverty_rate:.2%}")
print(f"Child poverty rate (full reform): {reformed_full_child_poverty_rate:.2%}")

print(f"\nChild poverty rate reduction (three-child limit): {three_child_poverty_reduction:.2%}")
print(f"Child poverty rate reduction (full reform): {full_reform_poverty_reduction:.2%}")

print(f"\nChildren lifted out of poverty (three-child limit): {children_out_of_poverty_three:,.0f}")
print(f"Children lifted out of poverty (full reform): {children_out_of_poverty_full:,.0f}")

# Percentage of full reform impact achieved
pct_of_full_reform = (children_out_of_poverty_three / children_out_of_poverty_full * 100) if children_out_of_poverty_full > 0 else 0
print(f"\nThree-child limit achieves {pct_of_full_reform:.1f}% of full reform's poverty reduction")

# ===== COST ANALYSIS =====
print("\n=== Cost Analysis ===")
baseline_income = baseline.calculate("household_net_income", year)
reformed_three_income = reformed_three_child.calculate("household_net_income", year)
reformed_full_income = reformed_full.calculate("household_net_income", year)

difference_three = reformed_three_income - baseline_income
difference_full = reformed_full_income - baseline_income

cost_three_child = difference_three.sum()
cost_full_reform = difference_full.sum()

print(f"Cost of three-child limit: £{cost_three_child/1e9:.2f}bn")
print(f"Cost of full reform (no limit): £{cost_full_reform/1e9:.2f}bn")

pct_of_full_cost = (cost_three_child / cost_full_reform * 100) if cost_full_reform > 0 else 0
print(f"\nThree-child limit costs {pct_of_full_cost:.1f}% of full reform")

savings = cost_full_reform - cost_three_child
print(f"Savings compared to full reform: £{savings/1e9:.2f}bn")

# ===== COST-EFFECTIVENESS =====
print("\n=== Cost-Effectiveness ===")
cost_per_child_three = cost_three_child / children_out_of_poverty_three if children_out_of_poverty_three > 0 else 0
cost_per_child_full = cost_full_reform / children_out_of_poverty_full if children_out_of_poverty_full > 0 else 0

print(f"Cost per child lifted from poverty (three-child limit): £{cost_per_child_three:,.0f}")
print(f"Cost per child lifted from poverty (full reform): £{cost_per_child_full:,.0f}")

print("\n" + "="*60)
print("ANALYSIS COMPLETE")
print("="*60)
print("\nSummary: Moving from a two-child limit to a three-child limit would:")
print(f"  - Cost £{cost_three_child/1e9:.2f}bn (vs £{cost_full_reform/1e9:.2f}bn for full reform)")
print(f"  - Lift {children_out_of_poverty_three:,.0f} children out of poverty")
print(f"  - Achieve {pct_of_full_reform:.1f}% of full reform's poverty impact at {pct_of_full_cost:.1f}% of the cost")
