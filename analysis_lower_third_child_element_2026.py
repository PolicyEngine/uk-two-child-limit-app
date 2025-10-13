from policyengine_uk import Microsimulation, Scenario
import pandas as pd
import numpy as np

dataset = "hf://policyengine/policyengine-uk-data/enhanced_frs_2023_24.h5"

# Analysis for 2026 only
year = 2026

print(f"\n{'='*60}")
print(f"ANALYSIS FOR {year}")
print(f"Lower Child Element for Third and Subsequent Children")
print(f"{'='*60}")

# Create baseline microsimulation (status quo with two-child limit)
baseline = Microsimulation(dataset=dataset)

# Create full reform scenario (remove two-child limit completely)
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
    'child_index',  # Birth order ranking
    'uc_individual_child_element',  # UC child element amount
    'uc_is_child_limit_affected',
    'universal_credit',
    'person_weight',
    'household_weight',
]

baseline_data = {}
for var in vars_to_analyze:
    baseline_data[var] = baseline.calculate(var, year, map_to="person").values

baseline_df = pd.DataFrame(baseline_data)

# Get reformed scenario data to see full child elements
reformed_data = {}
for var in ['person_id', 'uc_individual_child_element']:
    reformed_data[var] = reformed_full.calculate(var, year, map_to="person").values
reformed_df = pd.DataFrame(reformed_data)
reformed_df.columns = ['person_id', 'uc_individual_child_element_reformed']

baseline_df = baseline_df.merge(reformed_df, on='person_id', how='left')

# ===== CHILDREN ANALYSIS BY BIRTH ORDER =====
children_df = baseline_df[baseline_df['is_child'] == True].copy()
total_children = children_df['person_weight'].sum()

print("\n=== Children by Birth Order ===")
for i in range(1, 6):
    child_n = children_df[children_df['child_index'] == i]
    count = child_n['person_weight'].sum()
    print(f"Child #{i}: {count:,.0f} ({100 * count / total_children:.2f}%)")

children_3plus = children_df[children_df['child_index'] >= 3]
count_3plus = children_3plus['person_weight'].sum()
print(f"Children 3rd+: {count_3plus:,.0f} ({100 * count_3plus / total_children:.2f}%)")

# ===== CURRENT CHILD ELEMENT AMOUNTS =====
print("\n=== Current UC Child Element Amounts ===")
children_with_uc = children_df[children_df['universal_credit'] > 0]

# Get standard child element amount (from first/second children in reformed scenario)
first_second_children_reformed = children_df[children_df['child_index'].isin([1, 2])]
standard_element = first_second_children_reformed['uc_individual_child_element_reformed'].mode()[0] if len(first_second_children_reformed) > 0 else 0

print(f"Standard child element (1st/2nd children): £{standard_element:,.0f}/year")

# Check if there's a different rate for 1st child (like legacy benefits)
first_child_element = children_df[children_df['child_index'] == 1]['uc_individual_child_element_reformed'].mode()[0] if len(children_df[children_df['child_index'] == 1]) > 0 else 0
second_child_element = children_df[children_df['child_index'] == 2]['uc_individual_child_element_reformed'].mode()[0] if len(children_df[children_df['child_index'] == 2]) > 0 else 0

if first_child_element != second_child_element:
    print(f"Note: First child element (£{first_child_element:,.0f}) differs from second child (£{second_child_element:,.0f})")
else:
    print(f"Note: Same rate applies to 1st and 2nd children")

# ===== FULL REFORM COST =====
print("\n=== Full Reform Cost (Baseline) ===")
baseline_income = baseline.calculate("household_net_income", year)
reformed_income = reformed_full.calculate("household_net_income", year)
difference_income = reformed_income - baseline_income
total_cost_full_reform = difference_income.sum()

print(f"Cost of removing two-child limit completely: £{total_cost_full_reform/1e9:.2f}bn")

# ===== SIMULATE LOWER CHILD ELEMENT FOR 3RD+ CHILDREN =====
print("\n" + "="*60)
print("SCENARIO ANALYSIS: Different Reduction Levels for 3rd+ Children")
print("="*60)

# Test different reduction scenarios
reduction_scenarios = [
    (0.50, "50% of standard rate"),
    (0.60, "60% of standard rate"),
    (0.67, "67% (two-thirds) of standard rate"),
    (0.75, "75% of standard rate"),
    (0.80, "80% of standard rate"),
    (0.90, "90% of standard rate"),
]

# Calculate how many 3rd+ children would be affected in UC families
children_3plus_uc = children_df[(children_df['child_index'] >= 3) & (children_df['universal_credit'] > 0)]
count_3plus_uc = children_3plus_uc['person_weight'].sum()

print(f"\n3rd+ children in UC families: {count_3plus_uc:,.0f}")
print(f"Standard element they would receive with full reform: £{standard_element:,.0f}/year")

print("\n" + "-"*60)
for reduction_rate, description in reduction_scenarios:
    # Calculate reduced element
    reduced_element = standard_element * reduction_rate
    savings_per_child = standard_element - reduced_element

    # Estimate total savings (compared to full reform)
    # This is a simplified calculation
    total_savings = savings_per_child * count_3plus_uc
    estimated_cost = total_cost_full_reform - total_savings

    print(f"\nScenario: 3rd+ children receive {description}")
    print(f"  Reduced element: £{reduced_element:,.0f}/year (saving £{savings_per_child:,.0f} per child)")
    print(f"  Estimated total savings: £{total_savings/1e9:.2f}bn")
    print(f"  Estimated policy cost: £{estimated_cost/1e9:.2f}bn")
    print(f"  As % of full reform cost: {100 * estimated_cost / total_cost_full_reform:.1f}%")

# ===== DETAILED ANALYSIS FOR TWO-THIRDS SCENARIO =====
print("\n" + "="*60)
print("DETAILED ANALYSIS: Two-Thirds Rate for 3rd+ Children")
print("(Most comparable to other reforms)")
print("="*60)

reduction_rate = 0.67
reduced_element = standard_element * reduction_rate
savings_per_child = standard_element - reduced_element
total_savings = savings_per_child * count_3plus_uc
estimated_cost = total_cost_full_reform - total_savings

print(f"\nPolicy Design:")
print(f"  - 1st and 2nd children: £{standard_element:,.0f}/year (100%)")
print(f"  - 3rd+ children: £{reduced_element:,.0f}/year (67%)")
print(f"  - Reduction: £{savings_per_child:,.0f}/year per 3rd+ child")

print(f"\nEstimated Cost:")
print(f"  - Full reform (no limit): £{total_cost_full_reform/1e9:.2f}bn")
print(f"  - This policy: £{estimated_cost/1e9:.2f}bn")
print(f"  - Savings vs full reform: £{total_savings/1e9:.2f}bn")
print(f"  - Cost as % of full reform: {100 * estimated_cost / total_cost_full_reform:.1f}%")

# ===== FAMILIES IMPACTED =====
# Identify families with 3+ children
benunits_with_3plus = children_df[children_df['child_index'] >= 3]['benunit_id'].unique()
benunit_df = baseline_df.groupby('benunit_id').agg({
    'household_weight': 'first',
    'universal_credit': 'first',
}).reset_index()

benunit_df['has_3plus_children'] = benunit_df['benunit_id'].isin(benunits_with_3plus)
families_with_3plus = benunit_df[benunit_df['has_3plus_children'] == True]
families_with_3plus_uc = families_with_3plus[families_with_3plus['universal_credit'] > 0]

print(f"\nFamilies Affected:")
print(f"  - Total families with 3+ children: {families_with_3plus['household_weight'].sum():,.0f}")
print(f"  - UC families with 3+ children: {families_with_3plus_uc['household_weight'].sum():,.0f}")
print(f"  - These families would receive a lower rate for their 3rd+ children")

# ===== POVERTY IMPACT =====
print("\n=== Poverty Impact (Full Reform - for comparison) ===")
baseline_in_poverty = baseline.calculate("in_poverty", year, map_to="person").values
reformed_in_poverty = reformed_full.calculate("in_poverty", year, map_to="person").values
person_weights = baseline.calculate("person_weight", year, map_to="person").values
is_child = baseline.calculate("is_child", year, map_to="person").values

child_weights = person_weights * is_child
baseline_child_poverty_rate = (baseline_in_poverty * child_weights).sum() / child_weights.sum()
reformed_child_poverty_rate = (reformed_in_poverty * child_weights).sum() / child_weights.sum()
child_poverty_rate_reduction = baseline_child_poverty_rate - reformed_child_poverty_rate

children_out_of_poverty = (baseline_in_poverty * is_child * person_weights).sum() - (reformed_in_poverty * is_child * person_weights).sum()

print(f"Child poverty rate (baseline): {baseline_child_poverty_rate:.2%}")
print(f"Child poverty rate (full reform): {reformed_child_poverty_rate:.2%}")
print(f"Child poverty rate reduction: {child_poverty_rate_reduction:.2%}")
print(f"Children lifted out of poverty: {children_out_of_poverty:,.0f}")

print("\nNote: This analysis shows full reform impact. The lower child element policy")
print("would have a smaller poverty reduction impact, roughly proportional to cost savings.")

# ===== POLICY COMPARISON =====
print("\n" + "="*60)
print("POLICY ADVANTAGES")
print("="*60)
print("\n1. NO CLIFF EDGES:")
print("   Unlike the two-child limit, there's no sudden loss of support")
print("   Every child receives some support, just at different rates")

print("\n2. ECONOMIES OF SCALE RATIONALE:")
print("   Can justify lower rates for 3rd+ children based on lower marginal costs")
print("   Similar to how Child Benefit already pays less for 2nd+ children")

print("\n3. FLEXIBLE COST CONTROL:")
print("   Can adjust the reduction rate (50%, 67%, 75%) to meet budget targets")
print("   More predictable costing than exemptions-based approaches")

print("\n4. PRECEDENT IN BENEFIT SYSTEM:")
print("   Legacy benefits paid higher rates for first child")
print("   Child Benefit: £25.60/week (1st) vs £16.95/week (2nd+)")
print("   This would mirror that structure in UC")

print("\n5. NO PERVERSE INCENTIVES:")
print("   No 'gaming' by claiming exemptions (disability, multiple births, etc.)")
print("   Simpler administration than complex exemption rules")

# ===== COST-EFFECTIVENESS =====
print("\n" + "="*60)
print("COST-EFFECTIVENESS COMPARISON")
print("="*60)

cost_per_child_full = total_cost_full_reform / children_out_of_poverty if children_out_of_poverty > 0 else 0
cost_per_child_twothirds = estimated_cost / (children_out_of_poverty * 0.67) if children_out_of_poverty > 0 else 0

print(f"\nEstimated cost per child lifted from poverty:")
print(f"  - Full reform: £{cost_per_child_full:,.0f}")
print(f"  - Two-thirds rate policy: ~£{cost_per_child_twothirds:,.0f}")
print(f"\nNote: Poverty reduction estimates are approximate and would require detailed modeling")

print("\n" + "="*60)
print("ANALYSIS COMPLETE")
print("="*60)
print("\nSummary: A lower child element for 3rd+ children provides:")
print(f"  - Cost savings: Can be scaled to any budget (e.g., 67% rate = {100 * estimated_cost / total_cost_full_reform:.1f}% of full reform)")
print("  - No cliff edges: Every child gets some support")
print("  - Precedent: Similar to Child Benefit and legacy benefit structures")
print("  - Simplicity: No complex exemption rules or perverse incentives")
