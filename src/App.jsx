import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Results from './components/Results'
import './App.css'

function App() {
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedPolicies, setSelectedPolicies] = useState(['full-abolition']) // Changed to array
  const [policyParams, setPolicyParams] = useState({
    'full-abolition': {},
    'three-child-limit': { childLimit: 3 },
    'under-five-exemption': { ageLimit: 5 },
    'disabled-child-exemption': {},
    'working-families-exemption': {},
    'lower-third-child-element': { reductionRate: 0.7 },
  })
  const [results, setResults] = useState({}) // Changed to object to store results by policy
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
      const rowParameter = values[2] === '' || values[2] === 'None' ? null : parseFloat(values[2])
      const metric = values[3]
      const value = parseFloat(values[4])

      // Filter for selected year, policy, and parameter (if applicable)
      if (rowYear === year && rowPolicy === policy) {
        if (policy === 'three-child-limit' || policy === 'under-five-exemption' || policy === 'lower-third-child-element') {
          // For policies with parameters, match the specific parameter value
          // Convert both to numbers for comparison to handle 3 vs 3.0
          if (Number(rowParameter) === Number(parameter)) {
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
    // Delay showing loading indicator to avoid flash for quick operations
    const loadingTimeout = setTimeout(() => {
      setLoading(true)
    }, 300) // Only show loading if it takes more than 300ms

    setError(null)
    // Don't clear results immediately to prevent white flash
    // setResults({})

    try {
      // Fetch comprehensive CSV data
      const response = await fetch('/data/all-results.csv')

      if (!response.ok) {
        throw new Error('Failed to load analysis data')
      }

      const csvText = await response.text()
      const allResults = {}

      // Process each selected policy
      for (const selectedPolicy of selectedPolicies) {
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

        console.log(`Processing policy: ${selectedPolicy}, parameter: ${parameter}`)

        // Get data for all years (2026-2029)
        const years = ['2026', '2027', '2028', '2029']
        const allYearsData = years.map(year => {
          const yearData = parseComprehensiveCSV(csvText, year, selectedPolicy, parameter)
          return {
            year: year,
            cost: yearData.cost,
            familiesAffected: yearData.familiesAffected,
            childrenNoLongerLimited: yearData.childrenNoLongerLimited,
            childrenOutOfPoverty: yearData.childrenOutOfPoverty,
            povertyRateReduction: yearData.povertyRateReduction,
            baselinePovertyRate: yearData.baselinePovertyRate,
            reformedPovertyRate: yearData.reformedPovertyRate,
            costPerChild: yearData.costPerChild,
          }
        })

        // Get data for 2026 (for main results display)
        const data2026 = parseComprehensiveCSV(csvText, '2026', selectedPolicy, parameter)
        console.log(`Data for ${selectedPolicy}:`, data2026)
        console.log(`All years data for ${selectedPolicy}:`, allYearsData)

        // Prepare budgetary impact data
        const budgetaryImpact = allYearsData.map(d => ({
          year: d.year,
          cost: d.cost / 1e9 // Convert to billions
        }))

        // Format the results
        const formattedResults = {
          policyId: selectedPolicy,
          cost: data2026.cost,
          fullReformCost: data2026.fullReformCost || data2026.cost,
          familiesAffected: data2026.familiesAffected,
          totalAffectedFamilies: data2026.totalAffectedFamilies,
          childrenNoLongerLimited: data2026.childrenNoLongerLimited,
          totalLimitedChildren: data2026.childrenNoLongerLimited,
          childrenOutOfPoverty: data2026.childrenOutOfPoverty,
          baselinePovertyRate: data2026.baselinePovertyRate,
          reformedPovertyRate: data2026.reformedPovertyRate,
          povertyRateReduction: data2026.povertyRateReduction,
          costPerChild: data2026.costPerChild,
          budgetaryImpact: budgetaryImpact,
          allYearsData: allYearsData, // Add all years data
          policySpecific: {},
          warnings: [],
        }

        // Add policy-specific data
        if (selectedPolicy === 'three-child-limit') {
        formattedResults.policySpecific = {
          'Child Limit': policyParams[selectedPolicy].childLimit,
          'Families with 3 children': data2026.familiesWith3Children,
          'Families with 4+ children': data2026.familiesWith4PlusChildren,
        }
      } else if (selectedPolicy === 'under-five-exemption') {
        formattedResults.policySpecific = {
          'Age Limit': `${policyParams[selectedPolicy].ageLimit} years`,
          'Total children under 5': data2026.totalChildrenUnder5,
          'Affected children under 5': data2026.affectedChildrenUnder5,
        }
      } else if (selectedPolicy === 'disabled-child-exemption') {
        formattedResults.policySpecific = {
          'Total disabled children': data2026.disabledChildren,
          'Families with disabled child': data2026.familiesWithDisabledChild,
        }
        if (data2026.publishedCost) {
          formattedResults.warnings.push(
            `Published estimate: £${(data2026.publishedCost / 1e9).toFixed(1)}bn cost, ${data2026.publishedChildrenOutOfPoverty.toLocaleString()} children lifted from poverty`
          )
          formattedResults.warnings.push(
            'Large discrepancy due to small sample size in FRS data. Use published estimates for policy decisions.'
          )
        }
      } else if (selectedPolicy === 'working-families-exemption') {
        formattedResults.policySpecific = {
          'Working families exempt': data2026.workingFamilies,
          'Non-working families still affected': data2026.nonWorkingFamilies,
        }
      } else if (selectedPolicy === 'lower-third-child-element') {
          formattedResults.policySpecific = {
            'Reduction rate': `${Math.round(data2026.reductionRate * 100)}%`,
            'Standard element': `£${data2026.standardElement?.toLocaleString() || '3,626'}/year`,
            'Reduced element (3rd+)': `£${data2026.reducedElement?.toLocaleString()}/year`,
            'Children 3rd+': data2026.thirdPlusChildren,
          }
        }

        allResults[selectedPolicy] = formattedResults
      }

      setResults(allResults)
    } catch (err) {
      setError(err.message)
    } finally {
      clearTimeout(loadingTimeout)
      setLoading(false)
    }
  }

  const handleParamChange = (policy, param, value) => {
    setPolicyParams(prev => ({
      ...prev,
      [policy]: {
        ...prev[policy],
        [param]: value,
      },
    }))
  }

  const handlePolicyToggle = (policyId) => {
    setSelectedPolicies(prev => {
      if (prev.includes(policyId)) {
        // Don't allow removing if it's the last one
        if (prev.length === 1) return prev
        return prev.filter(id => id !== policyId)
      } else {
        return [...prev, policyId]
      }
    })
  }

  // Automatically run analysis when policies or parameters change
  useEffect(() => {
    handleAnalyze()
  }, [selectedPolicies, policyParams])

  return (
    <div className="app">
      <Sidebar
        selectedPolicies={selectedPolicies}
        onPolicyToggle={handlePolicyToggle}
        policyParams={policyParams}
        onParamChange={handleParamChange}
        loading={loading}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
      <main className="main-content">
        <header className="header">
          <h1>Two-child limit policy analysis dashboard</h1>
          {Object.keys(results).length > 0 && (
            <div className="download-button-wrapper">
              <button
                className="download-button-header"
                onClick={() => {
                  // Trigger download from Results component
                  const event = new CustomEvent('downloadData', {
                    detail: { results, policies: selectedPolicies }
                  })
                  window.dispatchEvent(event)
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
              <span className="download-tooltip">Download results</span>
            </div>
          )}
        </header>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {Object.keys(results).length > 0 && <Results data={results} policies={selectedPolicies} policyParams={policyParams} />}
      </main>
    </div>
  )
}

export default App
