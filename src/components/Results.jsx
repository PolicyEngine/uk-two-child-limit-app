import { useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Results.css'

const policyNames = {
  'full-abolition': 'Full abolition',
  'three-child-limit': 'Higher child limit',
  'under-five-exemption': 'Age-based exemption',
  'disabled-child-exemption': 'Disabled child exemption',
  'working-families-exemption': 'Working families exemption',
  'lower-third-child-element': 'Reduced child element',
}

function Results({ data, policies }) {
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
  const prepareChartData = (metricKey) => {
    const years = ['2026', '2027', '2028', '2029']
    const chartData = years.map(year => {
      const yearData = { year }
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

  const handleDownload = () => {
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
          txtContent += `  ${policyNames[policyId]}: £${yearData[policyId].toFixed(2)}bn\n`
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
          txtContent += `  ${policyNames[policyId]}: ${yearData[policyId].toFixed(1)}k children\n`
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
          txtContent += `  ${policyNames[policyId]}: ${yearData[policyId].toFixed(1)}k children\n`
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

  // Listen for download event from App header
  useEffect(() => {
    const handleDownloadEvent = () => {
      handleDownload()
    }

    window.addEventListener('downloadData', handleDownloadEvent)

    return () => {
      window.removeEventListener('downloadData', handleDownloadEvent)
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
                  name={policyNames[policyId]}
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
                  name={policyNames[policyId]}
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
                  name={policyNames[policyId]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
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
