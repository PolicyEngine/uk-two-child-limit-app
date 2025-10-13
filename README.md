# UK Two-Child Limit Policy Analysis Dashboard

A React-based dashboard for analyzing different policy reform options for the UK's two-child limit on benefits.

## Features

- **5 Policy Reform Options**:
  1. Full Abolition (complete removal of two-child limit)
  2. Three-Child Limit (configurable child limit)
  3. Under-Five Exemption (configurable age threshold)
  4. Disabled Child Exemption (families with disabled children)
  5. Working Families Exemption (families with employment income)
  6. Lower Third+ Child Element (configurable reduction rate)

- **Interactive Parameters**: Adjust policy parameters before running analysis
- **Real-time Analysis**: Run Python PolicyEngine analysis scripts from the UI
- **Comprehensive Results**: View costs, poverty impact, and families affected

## Prerequisites

- Node.js (v16 or higher)
- Python 3.13 with PolicyEngine UK installed
- Required Python packages: `policyengine_uk`, `pandas`, `numpy`

## Installation

1. Install Node dependencies:
```bash
npm install
```

2. Ensure Python environment is set up:
```bash
# Using conda/python313
pip install policyengine-uk pandas numpy
```

## Running the Application

### Option 1: Run both server and client together
```bash
npm start
```

### Option 2: Run separately

Terminal 1 - Start the backend server:
```bash
npm run server
```

Terminal 2 - Start the React frontend:
```bash
npm run dev
```

Then open your browser to: **http://localhost:3000**

## Project Structure

```
uk-two-child-limit-app/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx          # Policy selection sidebar
│   │   ├── PolicyForm.jsx       # Parameter configuration
│   │   └── Results.jsx          # Results display
│   ├── App.jsx                  # Main application
│   └── main.jsx                 # Entry point
├── server.js                     # Express API server
├── analysis.py                   # Full abolition analysis
├── analysis_three_child_limit_2026.py
├── analysis_under_five_exemption_2026.py
├── analysis_disabled_child_exemption_2026.py
├── analysis_working_families_exemption_2026.py
└── analysis_lower_third_child_element_2026.py
```

## API Endpoints

### POST /api/analyze
Runs policy analysis for the selected reform.

**Request body:**
```json
{
  "policy": "three-child-limit",
  "params": {
    "childLimit": 3
  },
  "year": 2026
}
```

**Response:**
```json
{
  "cost": 1500000000,
  "fullReformCost": 2910000000,
  "familiesAffected": 300000,
  "childrenOutOfPoverty": 250000,
  "povertyRateReduction": 0.0289,
  ...
}
```

## Policy Parameters

### Three-Child Limit
- `childLimit` (integer, 3-10): Number of children supported

### Under-Five Exemption
- `ageLimit` (integer, 1-18): Age threshold in years

### Lower Third+ Child Element
- `reductionRate` (float, 0.5-1.0): Percentage of standard element for 3rd+ children

Other policies have no configurable parameters.

## Development

### Adding a New Policy

1. Create a new Python analysis script (e.g., `analysis_new_policy_2026.py`)
2. Add policy to `server.js` scriptMap
3. Add policy option to `Sidebar.jsx`
4. Add parameter inputs to `PolicyForm.jsx` if needed

### Modifying the UI

- Sidebar: `src/components/Sidebar.jsx` + `Sidebar.css`
- Parameters: `src/components/PolicyForm.jsx` + `PolicyForm.css`
- Results: `src/components/Results.jsx` + `Results.css`

## Troubleshooting

**Error: Cannot import PolicyEngine**
- Ensure you're using the correct Python environment (python313)
- Run: `pip install policyengine-uk`

**Error: Server connection refused**
- Check that the backend server is running on port 5000
- Run: `npm run server`

**Analysis takes too long**
- PolicyEngine microsimulation can take 30-60 seconds per analysis
- Check console for Python script progress

## License

ISC
