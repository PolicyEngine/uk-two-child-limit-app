# UK Two-Child Limit Policy Analysis

An interactive web application for analysing various reform options for the UK's two-child benefit limit policy. This tool allows users to compare multiple policy scenarios simultaneously and their impacts on household incomes, government spending, income distribution, and child poverty rates.

## About

The two-child limit prevents parents from claiming Universal Credit or Child Tax Credit for more than two children born after April 2017. This application examines various policy options for reforming the two-child limit.

## Features

- **Multi-policy comparison** - Select and compare multiple reform options simultaneously
- **Six policy reform options**:
  1. **Full abolition** - Complete removal of the two-child limit
  2. **Higher child limit** - Increase the child limit threshold (configurable: 3-16 children)
  3. **Age-based exemption** - Exempt children under a specified age (configurable: 3-16 years)
  4. **Disabled child exemption** - Exempt families with disabled children receiving DLA or PIP
  5. **Working families exemption** - Exempt families where at least one adult has employment income
  6. **Reduced child element** - Lower payment rate for 3rd+ children (configurable: 50-100%)

- **Interactive visualisations**:
  - Budgetary impact over time (2026-2029)
  - Number of children no longer limited
  - Children lifted from poverty
  - Child poverty rate changes (reduction from baseline or absolute rate)
  - Distributional analysis by income decile

## Prerequisites

- Node.js (v16 or higher)
- Python 3.13 with PolicyEngine UK installed
- Required Python packages: `policyengine_uk`, `pandas`, `numpy`

## Contact

For questions or feedback:
- Visit [PolicyEngine](https://policyengine.org)
- Email: hello@policyengine.org
- GitHub Issues: Report issues in this repository

## Acknowledgements

Built with [PolicyEngine](https://policyengine.org), an open-source policy analysis platform.
