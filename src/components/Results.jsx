import { useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Results.css'

function Results({ data, policies, policyParams }) {
  const [povertyChartMode, setPovertyChartMode] = useState('reduction')
  const [distYear, setDistYear] = useState('2026')
  const [distData, setDistData] = useState(null)

  const getPolicyName = (policyId) => {
    const baseNames = {
      'full-abolition': 'Full abolition',
      'three-child-limit': 'Higher child limit',
      'under-five-exemption': 'Age-based exemption',
      'disabled-child-exemption': 'Disabled child exemption',
      'working-families-exemption': 'Working families exemption',
      'lower-third-child-element': 'Reduced child element',
    }

    const params = policyParams?.[policyId]

    if (policyId === 'three-child-limit' && params?.childLimit) {
      return `${params.childLimit}-child limit`
    } else if (policyId === 'under-five-exemption' && params?.ageLimit) {
      return `Under-${params.ageLimit} exemption`
    } else if (policyId === 'lower-third-child-element' && params?.reductionRate) {
      return `${Math.round(params.reductionRate * 100)}% child element`
    }

    return baseNames[policyId] || policyId
  }
  const formatCurrency = (value) => {
    return `£${(value / 1e9).toFixed(2)}bn`
  }

  const formatNumber = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toLocaleString('en-GB')
  }

  const formatPercent = (value) => {
    return `${(value * 100).toFixed(2)}%`
  }

  // Animated Number Component
  const AnimatedNumber = ({ value, formatter = (v) => v }) => {
    const ref = useRef(null)
    const previousValue = useRef(value)

    useEffect(() => {
      if (!ref.current || previousValue.current === value) return

      const element = ref.current
      const start = previousValue.current || 0
      const end = value
      const duration = 800
      const startTime = performance.now()

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease-out cubic function for smooth deceleration
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const current = start + (end - start) * easeOutCubic

        element.textContent = formatter(current)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          element.textContent = formatter(end)
          previousValue.current = end
        }
      }

      requestAnimationFrame(animate)
    }, [value, formatter])

    return <span ref={ref}>{formatter(value)}</span>
  }

  // Prepare chart data for a specific metric across years
  const prepareChartData = (metricKey, includeBaseline = false) => {
    const years = ['2026', '2027', '2028', '2029']
    const chartData = years.map(year => {
      const yearData = { year }

      // Add baseline data if requested (for poverty rate absolute view)
      if (includeBaseline && metricKey === 'reformedPovertyRate') {
        const firstPolicyData = data[policies[0]]
        if (firstPolicyData?.allYearsData) {
          const yearInfo = firstPolicyData.allYearsData.find(item => item.year === year)
          if (yearInfo) {
            yearData['baseline'] = (yearInfo.baselinePovertyRate || 0) * 100
          }
        }
      }

      policies.forEach(policyId => {
        const policyData = data[policyId]

        // Find the data for this specific year from allYearsData
        if (policyData?.allYearsData) {
          const yearInfo = policyData.allYearsData.find(item => item.year === year)

          if (yearInfo) {
            if (metricKey === 'budgetaryImpact') {
              yearData[policyId] = (yearInfo.cost || 0) / 1e9 // Convert to billions
            } else if (metricKey === 'familiesAffected') {
              yearData[policyId] = (yearInfo.familiesAffected || 0) / 1000 // Convert to thousands
            } else if (metricKey === 'childrenNoLongerLimited') {
              yearData[policyId] = (yearInfo.childrenNoLongerLimited || 0) / 1000
            } else if (metricKey === 'childrenOutOfPoverty') {
              yearData[policyId] = (yearInfo.childrenOutOfPoverty || 0) / 1000
            } else if (metricKey === 'povertyRateReduction') {
              yearData[policyId] = (yearInfo.povertyRateReduction || 0) * 100 // Convert to percentage
            } else if (metricKey === 'reformedPovertyRate') {
              yearData[policyId] = (yearInfo.reformedPovertyRate || 0) * 100 // Convert to percentage
            } else if (metricKey === 'povertyRateChange') {
              yearData[policyId] = ((yearInfo.baselinePovertyRate || 0) - (yearInfo.reformedPovertyRate || 0)) * 100 // Change in pp
            }
          }
        }
      })
      return yearData
    })

    console.log(`Chart data for ${metricKey}:`, chartData)
    return chartData
  }

  const colors = ['#319795', '#5A8FB8', '#B8875A', '#5FB88A', '#4A7BA7', '#C59A5A']

  console.log('Results data:', data)
  console.log('Policies:', policies)

  const handleDownloadTxt = () => {
    let txtContent = 'UK Two-Child Limit Policy Analysis - Data Export\n'
    txtContent += '='.repeat(60) + '\n'
    txtContent += `Generated: ${new Date().toLocaleString('en-GB')}\n\n`

    // Export Budgetary Impact
    txtContent += 'BUDGETARY IMPACT (£bn)\n'
    txtContent += '-'.repeat(60) + '\n'
    const budgetData = prepareChartData('budgetaryImpact')
    budgetData.forEach(yearData => {
      txtContent += `\nYear: ${yearData.year}\n`
      policies.forEach(policyId => {
        if (yearData[policyId] !== undefined) {
          txtContent += `  ${getPolicyName(policyId)}: £${yearData[policyId].toFixed(2)}bn\n`
        }
      })
    })

    // Export Children No Longer Limited
    txtContent += '\n\nCHILDREN NO LONGER LIMITED (thousands)\n'
    txtContent += '-'.repeat(60) + '\n'
    const childrenLimitedData = prepareChartData('childrenNoLongerLimited')
    childrenLimitedData.forEach(yearData => {
      txtContent += `\nYear: ${yearData.year}\n`
      policies.forEach(policyId => {
        if (yearData[policyId] !== undefined) {
          txtContent += `  ${getPolicyName(policyId)}: ${yearData[policyId].toFixed(1)}k children\n`
        }
      })
    })

    // Export Children Lifted from Poverty
    txtContent += '\n\nCHILDREN LIFTED FROM POVERTY (thousands)\n'
    txtContent += '-'.repeat(60) + '\n'
    const povertyData = prepareChartData('childrenOutOfPoverty')
    povertyData.forEach(yearData => {
      txtContent += `\nYear: ${yearData.year}\n`
      policies.forEach(policyId => {
        if (yearData[policyId] !== undefined) {
          txtContent += `  ${getPolicyName(policyId)}: ${yearData[policyId].toFixed(1)}k children\n`
        }
      })
    })

    // Create and download file
    const blob = new Blob([txtContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `policy-analysis-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadCsv = () => {
    // Prepare CSV content
    let csvContent = 'UK Two-Child Limit Policy Analysis - Data Export\n'
    csvContent += `Generated: ${new Date().toLocaleString('en-GB')}\n\n`

    // Get all chart data
    const budgetData = prepareChartData('budgetaryImpact')
    const childrenLimitedData = prepareChartData('childrenNoLongerLimited')
    const povertyData = prepareChartData('childrenOutOfPoverty')
    const povertyRateReductionData = prepareChartData('povertyRateReduction')
    const reformedPovertyRateData = prepareChartData('reformedPovertyRate')

    // Create CSV header
    csvContent += 'Metric,Year,' + policies.map(p => getPolicyName(p)).join(',') + '\n'

    // Add Budgetary Impact rows
    budgetData.forEach(yearData => {
      const values = policies.map(policyId =>
        yearData[policyId] !== undefined ? yearData[policyId].toFixed(2) : ''
      )
      csvContent += `Budgetary Impact (£bn),${yearData.year},${values.join(',')}\n`
    })

    // Add Children No Longer Limited rows
    childrenLimitedData.forEach(yearData => {
      const values = policies.map(policyId =>
        yearData[policyId] !== undefined ? yearData[policyId].toFixed(1) : ''
      )
      csvContent += `Children No Longer Limited (thousands),${yearData.year},${values.join(',')}\n`
    })

    // Add Children Lifted from Poverty rows
    povertyData.forEach(yearData => {
      const values = policies.map(policyId =>
        yearData[policyId] !== undefined ? yearData[policyId].toFixed(1) : ''
      )
      csvContent += `Children Lifted from Poverty (thousands),${yearData.year},${values.join(',')}\n`
    })

    // Add Poverty Rate Reduction rows
    povertyRateReductionData.forEach(yearData => {
      const values = policies.map(policyId =>
        yearData[policyId] !== undefined ? yearData[policyId].toFixed(2) : ''
      )
      csvContent += `Poverty Rate Reduction (percentage points),${yearData.year},${values.join(',')}\n`
    })

    // Add Reformed Poverty Rate rows
    reformedPovertyRateData.forEach(yearData => {
      const values = policies.map(policyId =>
        yearData[policyId] !== undefined ? yearData[policyId].toFixed(2) : ''
      )
      csvContent += `Reformed Child Poverty Rate (%),${yearData.year},${values.join(',')}\n`
    })

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `policy-analysis-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Load distributional analysis data for all selected policies
  useEffect(() => {
    const loadDistData = async () => {
      try {
        const allDistData = {}

        // Track which policies have data loaded
        const policiesWithData = []

        // Load distributional data for each selected policy
        for (const policyId of policies) {
          let filename = ''
          const params = policyParams?.[policyId]

          if (policyId === 'full-abolition') {
            filename = `distributional-analysis-full-abolition-${distYear}.csv`
          } else if (policyId === 'three-child-limit' && params?.childLimit) {
            filename = `distributional-analysis-three-child-limit-${distYear}-limit${params.childLimit}.csv`
          } else if (policyId === 'under-five-exemption' && params?.ageLimit) {
            filename = `distributional-analysis-under-five-exemption-${distYear}-age${params.ageLimit}.csv`
          } else {
            // Skip policies that don't have distributional analysis
            continue
          }

          try {
            const response = await fetch(`/data/${filename}`)
            if (response.ok) {
              const csvText = await response.text()
              const lines = csvText.trim().split('\n')

              // Skip header line
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',')
                const decile = parseInt(values[0])
                const relativeChange = parseFloat(values[1])

                if (!allDistData[decile]) {
                  allDistData[decile] = { decile }
                }
                allDistData[decile][policyId] = relativeChange
              }

              // Mark this policy as having data
              if (!policiesWithData.includes(policyId)) {
                policiesWithData.push(policyId)
              }
            } else {
              console.log(`No distributional data file found for ${policyId}: ${filename}`)
            }
          } catch (err) {
            console.error(`Failed to load distributional data for ${policyId}:`, err)
          }
        }

        // Convert to array format for recharts
        const chartData = Object.values(allDistData).sort((a, b) => a.decile - b.decile)
        setDistData(chartData.length > 0 ? chartData : null)
      } catch (err) {
        console.error('Failed to load distributional data:', err)
      }
    }

    if (policies.length > 0) {
      loadDistData()
    }
  }, [distYear, policies, policyParams])

  // Listen for download events from App header
  useEffect(() => {
    const handleDownloadTxtEvent = () => {
      handleDownloadTxt()
    }

    const handleDownloadCsvEvent = () => {
      handleDownloadCsv()
    }

    window.addEventListener('downloadDataTxt', handleDownloadTxtEvent)
    window.addEventListener('downloadDataCsv', handleDownloadCsvEvent)

    return () => {
      window.removeEventListener('downloadDataTxt', handleDownloadTxtEvent)
      window.removeEventListener('downloadDataCsv', handleDownloadCsvEvent)
    }
  }, [data, policies])

  return (
    <div className="results">
      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Budgetary Impact Chart */}
        <div className="chart-section">
          <h3>Budgetary impact</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={prepareChartData('budgetaryImpact')} margin={{ top: 20, right: 30, left: 90, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="year" />
              <YAxis
                label={{ value: 'Cost (£bn)', angle: -90, position: 'insideLeft', dx: -30, style: { textAnchor: 'middle' } }}
                tickFormatter={(value) => `£${value.toFixed(1)}bn`}
              />
              <Tooltip
                formatter={(value) => `£${value.toFixed(2)}bn`}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {policies.map((policyId, index) => (
                <Bar
                  key={policyId}
                  dataKey={policyId}
                  fill={colors[index % colors.length]}
                  name={getPolicyName(policyId)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Children No Longer Limited Chart */}
        <div className="chart-section">
          <h3>Children no longer limited</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={prepareChartData('childrenNoLongerLimited')} margin={{ top: 20, right: 30, left: 90, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="year" />
              <YAxis
                label={{ value: 'Children (thousands)', angle: -90, position: 'insideLeft', dx: -30, style: { textAnchor: 'middle' } }}
                tickFormatter={(value) => `${value.toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => `${value.toFixed(1)}k children`}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {policies.map((policyId, index) => (
                <Bar
                  key={policyId}
                  dataKey={policyId}
                  fill={colors[index % colors.length]}
                  name={getPolicyName(policyId)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Children Lifted from Poverty Chart */}
        <div className="chart-section">
          <h3>Children lifted from poverty</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={prepareChartData('childrenOutOfPoverty')} margin={{ top: 20, right: 30, left: 90, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="year" />
              <YAxis
                label={{ value: 'Children (thousands)', angle: -90, position: 'insideLeft', dx: -30, style: { textAnchor: 'middle' } }}
                tickFormatter={(value) => `${value.toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => `${value.toFixed(1)}k children`}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {policies.map((policyId, index) => (
                <Bar
                  key={policyId}
                  dataKey={policyId}
                  fill={colors[index % colors.length]}
                  name={getPolicyName(policyId)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Child Poverty Rate Chart */}
        <div className="chart-section full-width">
          <div className="chart-header">
            <h3>Child poverty rate</h3>
            <div className="chart-toggle">
              <button
                className={povertyChartMode === 'reduction' ? 'active' : ''}
                onClick={() => setPovertyChartMode('reduction')}
              >
                Reduction from baseline
              </button>
              <button
                className={povertyChartMode === 'rate' ? 'active' : ''}
                onClick={() => setPovertyChartMode('rate')}
              >
                Absolute rate
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={prepareChartData(
                povertyChartMode === 'reduction' ? 'povertyRateReduction' : 'reformedPovertyRate',
                povertyChartMode === 'rate' // Include baseline only in 'rate' mode
              )}
              margin={{ top: 20, right: 30, left: 90, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="year" />
              <YAxis
                label={{
                  value: povertyChartMode === 'reduction' ? 'Reduction (percentage points)' : 'Child poverty rate (%)',
                  angle: -90,
                  position: 'insideLeft',
                  dx: -30,
                  style: { textAnchor: 'middle' }
                }}
                tickFormatter={(value) => povertyChartMode === 'reduction' ? `${value.toFixed(1)}pp` : `${value.toFixed(1)}%`}
              />
              <Tooltip
                formatter={(value) => povertyChartMode === 'reduction' ? `${value.toFixed(2)}pp reduction` : `${value.toFixed(2)}%`}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {povertyChartMode === 'rate' && (
                <Bar
                  dataKey="baseline"
                  fill="#9CA3AF"
                  name="Baseline (keeping two-child limit)"
                />
              )}
              {policies.map((policyId, index) => (
                <Bar
                  key={policyId}
                  dataKey={policyId}
                  fill={colors[index % colors.length]}
                  name={getPolicyName(policyId)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '12px' }}>
            Note: The baseline scenario maintains the current two-child limit policy.
          </p>
        </div>

        {/* Distributional Analysis Chart */}
        <div className="chart-section full-width">
          <div className="chart-header">
            <h3>Distributional analysis by income decile</h3>
            <select
              value={distYear}
              onChange={(e) => setDistYear(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e0e0e0',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2029">2029</option>
            </select>
          </div>
          {distData && distData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={distData} margin={{ top: 20, right: 30, left: 90, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="decile" label={{ value: 'Income decile', position: 'insideBottom', offset: -10 }} />
                  <YAxis
                    label={{
                      value: 'Relative change in household income (%)',
                      angle: -90,
                      position: 'insideLeft',
                      dx: -30,
                      style: { textAnchor: 'middle', fontSize: '12px' }
                    }}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                  />
                  <Tooltip
                    formatter={(value) => `${value.toFixed(2)}%`}
                    labelFormatter={(label) => `Decile ${label}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {policies.map((policyId, policyIndex) => {
                    // Only render bar if this policy has data in at least one decile
                    const hasData = distData.some(decileData => {
                      const value = decileData[policyId]
                      return value !== undefined && value !== null && !isNaN(value)
                    })

                    if (!hasData) return null

                    return (
                      <Bar
                        key={policyId}
                        dataKey={policyId}
                        fill={colors[policyIndex % colors.length]}
                        name={getPolicyName(policyId)}
                      />
                    )
                  })}
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '12px' }}>
                Note: Distributional analysis is only available for policies where the reform is directly calculated from microsimulation in PolicyEngine.
              </p>
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              No distributional analysis available for the selected policies.
            </div>
          )}
        </div>
      </div>

      <div className="results-grid" style={{ display: 'none' }}>
        {/* Old individual cards - hidden for now */}
        {data.cost && (
          <div className="result-card highlight">
            <h3>Cost estimate</h3>
            <div className="result-value large">
              <AnimatedNumber value={data.cost} formatter={formatCurrency} />
            </div>
            {data.fullReformCost && (
              <div className="result-comparison">
                Full reform: {formatCurrency(data.fullReformCost)}
                <span className="percentage">
                  ({((data.cost / data.fullReformCost) * 100).toFixed(1)}% of full reform)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Families Affected */}
        {data.familiesAffected !== undefined && (
          <div className="result-card">
            <h3>Families benefiting</h3>
            <div className="result-value">
              <AnimatedNumber value={data.familiesAffected} formatter={formatNumber} />
            </div>
            {data.totalAffectedFamilies && (
              <div className="result-detail">
                Out of {formatNumber(data.totalAffectedFamilies)} affected families
              </div>
            )}
          </div>
        )}

        {/* Children Impact */}
        {data.childrenNoLongerLimited !== undefined && (
          <div className="result-card">
            <h3>Children no longer limited</h3>
            <div className="result-value">
              <AnimatedNumber value={data.childrenNoLongerLimited} formatter={formatNumber} />
            </div>
            {data.totalLimitedChildren && (
              <div className="result-detail">
                Out of {formatNumber(data.totalLimitedChildren)} currently limited
              </div>
            )}
          </div>
        )}

        {/* Poverty Reduction */}
        {data.childrenOutOfPoverty !== undefined && (
          <div className="result-card highlight">
            <h3>Children lifted from poverty</h3>
            <div className="result-value">
              <AnimatedNumber value={data.childrenOutOfPoverty} formatter={formatNumber} />
            </div>
            {data.povertyRateReduction && (
              <div className="result-detail">
                Poverty rate reduction: {formatPercent(data.povertyRateReduction)}
              </div>
            )}
          </div>
        )}

        {/* Child Poverty Rates */}
        {data.baselinePovertyRate !== undefined && (
          <div className="result-card">
            <h3>Child poverty rate</h3>
            <div className="result-comparison-box">
              <div className="comparison-item">
                <span className="label">Baseline:</span>
                <span className="value">{formatPercent(data.baselinePovertyRate)}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Reformed:</span>
                <span className="value">{formatPercent(data.reformedPovertyRate)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cost Effectiveness */}
        {data.costPerChild !== undefined && (
          <div className="result-card">
            <h3>Cost per child lifted from poverty</h3>
            <div className="result-value">£{formatNumber(Math.round(data.costPerChild))}</div>
          </div>
        )}
      </div>

      {/* Policy-specific details */}
      {data.policySpecific && (
        <div className="policy-specific-section">
          <h3>Policy-specific details</h3>
          <div className="detail-grid">
            {Object.entries(data.policySpecific).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{key}:</span>
                <span className="detail-value">
                  {typeof value === 'number' && value > 1000
                    ? formatNumber(value)
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw output for debugging */}
      {data.rawOutput && (
        <details className="raw-output">
          <summary>View detailed analysis output</summary>
          <pre>{data.rawOutput}</pre>
        </details>
      )}

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="warnings">
          <h4>⚠️ Important notes</h4>
          {data.warnings.map((warning, idx) => (
            <p key={idx}>{warning}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default Results
