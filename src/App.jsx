import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Results from './components/Results'
import './App.css'

function App() {
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedPolicy, setSelectedPolicy] = useState('full-abolition')
  const [policyParams, setPolicyParams] = useState({
    'full-abolition': {},
    'three-child-limit': { childLimit: 3 },
    'under-five-exemption': { ageLimit: 5 },
    'disabled-child-exemption': {},
    'working-families-exemption': {},
    'lower-third-child-element': { reductionRate: 0.7 },
  })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Function to parse comprehensive CSV data
  const parseComprehensiveCSV = (text, year, policy, parameter = null) => {
    const lines = text.trim().split('\n')
    const data = {}

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const rowYear = values[0]
      const rowPolicy = values[1]
      const rowParameter = values[2] === '' || values[2] === 'None' ? null : parseInt(values[2])
      const metric = values[3]
      const value = parseFloat(values[4])

      // Filter for selected year, policy, and parameter (if applicable)
      if (rowYear === year && rowPolicy === policy) {
        if (policy === 'three-child-limit' || policy === 'under-five-exemption' || policy === 'lower-third-child-element') {
          // For policies with parameters, match the specific parameter value
          if (rowParameter === parameter) {
            data[metric] = value
          }
        } else {
          // For other policies, ignore parameter
          data[metric] = value
        }
      }
    }

    return data
  }

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      // Fetch comprehensive CSV data
      const response = await fetch('/data/all-results.csv')

      if (!response.ok) {
        throw new Error('Failed to load analysis data')
      }

      const csvText = await response.text()

      // Get the parameter value based on policy type
      let parameter = null
      if (selectedPolicy === 'three-child-limit') {
        parameter = policyParams[selectedPolicy].childLimit
      } else if (selectedPolicy === 'under-five-exemption') {
        parameter = policyParams[selectedPolicy].ageLimit
      } else if (selectedPolicy === 'lower-third-child-element') {
        // Convert reduction rate (0.5-1.0) to percentage (50-100)
        parameter = Math.round(policyParams[selectedPolicy].reductionRate * 100)
      }

      const data = parseComprehensiveCSV(csvText, selectedYear, selectedPolicy, parameter)

      // Format the results
      const formattedResults = {
        cost: data.cost,
        fullReformCost: data.fullReformCost || data.cost,
        familiesAffected: data.familiesAffected,
        totalAffectedFamilies: data.totalAffectedFamilies,
        childrenNoLongerLimited: data.childrenNoLongerLimited,
        totalLimitedChildren: data.childrenNoLongerLimited,
        childrenOutOfPoverty: data.childrenOutOfPoverty,
        baselinePovertyRate: data.baselinePovertyRate,
        reformedPovertyRate: data.reformedPovertyRate,
        povertyRateReduction: data.povertyRateReduction,
        costPerChild: data.costPerChild,
        policySpecific: {},
        warnings: [],
      }

      // Add policy-specific data
      if (selectedPolicy === 'three-child-limit') {
        formattedResults.policySpecific = {
          'Child Limit': policyParams[selectedPolicy].childLimit,
          'Families with 3 children': data.familiesWith3Children,
          'Families with 4+ children': data.familiesWith4PlusChildren,
        }
      } else if (selectedPolicy === 'under-five-exemption') {
        formattedResults.policySpecific = {
          'Age Limit': `${policyParams[selectedPolicy].ageLimit} years`,
          'Total children under 5': data.totalChildrenUnder5,
          'Affected children under 5': data.affectedChildrenUnder5,
        }
      } else if (selectedPolicy === 'disabled-child-exemption') {
        formattedResults.policySpecific = {
          'Total disabled children': data.disabledChildren,
          'Families with disabled child': data.familiesWithDisabledChild,
        }
        if (data.publishedCost) {
          formattedResults.warnings.push(
            `Published estimate: £${(data.publishedCost / 1e9).toFixed(1)}bn cost, ${data.publishedChildrenOutOfPoverty.toLocaleString()} children lifted from poverty`
          )
          formattedResults.warnings.push(
            'Large discrepancy due to small sample size in FRS data. Use published estimates for policy decisions.'
          )
        }
      } else if (selectedPolicy === 'working-families-exemption') {
        formattedResults.policySpecific = {
          'Working families exempt': data.workingFamilies,
          'Non-working families still affected': data.nonWorkingFamilies,
        }
      } else if (selectedPolicy === 'lower-third-child-element') {
        formattedResults.policySpecific = {
          'Reduction rate': `${Math.round(data.reductionRate * 100)}%`,
          'Standard element': `£${data.standardElement?.toLocaleString() || '3,626'}/year`,
          'Reduced element (3rd+)': `£${data.reducedElement?.toLocaleString()}/year`,
          'Children 3rd+': data.thirdPlusChildren,
        }
      }

      setResults(formattedResults)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleParamChange = (param, value) => {
    setPolicyParams(prev => ({
      ...prev,
      [selectedPolicy]: {
        ...prev[selectedPolicy],
        [param]: value,
      },
    }))
  }

  return (
    <div className="app">
      <Sidebar
        selectedPolicy={selectedPolicy}
        onSelectPolicy={setSelectedPolicy}
        params={policyParams[selectedPolicy]}
        onParamChange={handleParamChange}
        onAnalyze={handleAnalyze}
        loading={loading}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
      <main className="main-content">
        <header className="header">
          <h1>Two-child limit policy analysis dashboard</h1>
        </header>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {results && <Results data={results} policy={selectedPolicy} />}
      </main>
    </div>
  )
}

export default App
