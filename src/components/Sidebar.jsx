import { useState } from 'react'
import './Sidebar.css'

const policies = [
  {
    id: 'full-abolition',
    name: 'Full abolition',
    description: 'Complete removal of two-child limit',
    info: 'Remove the two-child limit entirely so families receive support for all children.',
  },
  {
    id: 'three-child-limit',
    name: 'Higher child limit',
    description: 'Increase the child limit threshold',
    info: 'Families receive support for additional children beyond the current two-child limit.',
  },
  {
    id: 'under-five-exemption',
    name: 'Age-based exemption',
    description: 'Exempt children under specified age',
    info: 'Younger children are exempt from the limit, but families may lose support as children age.',
  },
  {
    id: 'disabled-child-exemption',
    name: 'Disabled child exemption',
    description: 'Exempt families with disabled children',
    info: 'Families with a disabled child receiving disability benefits are exempt from the limit.',
  },
  {
    id: 'working-families-exemption',
    name: 'Working families exemption',
    description: 'Exempt families where adults work',
    info: 'The limit only applies to out-of-work families, exempting working households.',
  },
  {
    id: 'lower-third-child-element',
    name: 'Reduced child element',
    description: 'Lower payment rate for additional children',
    info: 'Additional children receive a reduced payment rate compared to earlier children.',
  },
]

function Sidebar({ selectedPolicies, onPolicyToggle, policyParams, onParamChange, loading, selectedYear, onYearChange }) {
  const [showPolicyList, setShowPolicyList] = useState(true) // Show by default for multi-select
  const [expandedPolicy, setExpandedPolicy] = useState(null) // Track which policy params are shown

  const hasAdjustableParameters = (policyId) => {
    return ['three-child-limit', 'under-five-exemption', 'lower-third-child-element'].includes(policyId)
  }

  const renderParameterInputs = (policyId) => {
    const params = policyParams[policyId]

    switch (policyId) {
      case 'full-abolition':
      case 'disabled-child-exemption':
      case 'working-families-exemption':
        return null

      case 'three-child-limit':
        return (
          <div className="param-group">
            <label htmlFor={`childLimit-${policyId}`}>
              Child limit
              <span className="param-description">
                Support provided for up to this many children
              </span>
            </label>
            <input
              id={`childLimit-${policyId}`}
              type="number"
              min="3"
              max="9"
              value={params.childLimit || 3}
              onChange={(e) => onParamChange(policyId, 'childLimit', parseInt(e.target.value))}
            />
          </div>
        )

      case 'under-five-exemption':
        return (
          <div className="param-group">
            <label htmlFor={`ageLimit-${policyId}`}>
              Age exemption threshold (years)
              <span className="param-description">
                Children under this age are exempt from the limit
              </span>
            </label>
            <input
              id={`ageLimit-${policyId}`}
              type="number"
              min="3"
              max="9"
              value={params.ageLimit || 5}
              onChange={(e) => onParamChange(policyId, 'ageLimit', parseInt(e.target.value))}
            />
          </div>
        )

      case 'lower-third-child-element':
        return (
          <div className="param-group">
            <label htmlFor={`reductionRate-${policyId}`}>
              Third+ child element rate
              <span className="param-description">
                Percentage of standard child element for 3rd+ children
              </span>
            </label>
            <div className="slider-container">
              <input
                id={`reductionRate-${policyId}`}
                type="range"
                min="0.5"
                max="1"
                step="0.1"
                value={params.reductionRate || 0.7}
                onChange={(e) => onParamChange(policyId, 'reductionRate', parseFloat(e.target.value))}
                style={{
                  background: `linear-gradient(to right, var(--pe-teal) 0%, var(--pe-teal) ${((params.reductionRate || 0.7) - 0.5) / 0.5 * 100}%, white ${((params.reductionRate || 0.7) - 0.5) / 0.5 * 100}%, white 100%)`
                }}
              />
              <span className="slider-value">
                {Math.round((params.reductionRate || 0.7) * 100)}%
              </span>
            </div>
            <div className="slider-labels">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/white.png" alt="PolicyEngine" className="logo" />

        <h3 style={{ color: 'white', marginBottom: '1rem' }}>Select policies to compare</h3>

        {/* Policy List with Checkboxes */}
        <div className="policy-list-multi">
          {policies.map((policy) => (
            <div key={policy.id} className="policy-checkbox-item">
              <label className="policy-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedPolicies.includes(policy.id)}
                  onChange={() => onPolicyToggle(policy.id)}
                  disabled={selectedPolicies.includes(policy.id) && selectedPolicies.length === 1}
                />
                <div className="policy-info">
                  <div className="policy-name-wrapper">
                    <div className="policy-name">{policy.name}</div>
                    <div className="info-icon-wrapper">
                      <svg className="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      <div className="info-tooltip">{policy.info}</div>
                    </div>
                  </div>
                </div>
              </label>

              {/* Show parameters if policy is selected and has adjustable parameters */}
              {selectedPolicies.includes(policy.id) && hasAdjustableParameters(policy.id) && (
                <div className="policy-params-inline">
                  {renderParameterInputs(policy.id)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-indicator">
          <span className="spinner"></span>
          <span>Analyzing {selectedPolicies.length} {selectedPolicies.length === 1 ? 'policy' : 'policies'}...</span>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
