import { useState } from 'react'
import './Sidebar.css'

const policies = [
  {
    id: 'full-abolition',
    name: 'Full Abolition',
    description: 'Complete removal of two-child limit',
  },
  {
    id: 'three-child-limit',
    name: 'Three-Child Limit',
    description: 'Move from two-child to three-child limit',
  },
  {
    id: 'under-five-exemption',
    name: 'Under-Five Exemption',
    description: 'Exempt children under specified age',
  },
  {
    id: 'disabled-child-exemption',
    name: 'Disabled Child Exemption',
    description: 'Exempt families with disabled children',
  },
  {
    id: 'working-families-exemption',
    name: 'Working Families Exemption',
    description: 'Exempt families where adults work',
  },
  {
    id: 'lower-third-child-element',
    name: 'Lower Third+ Child Element',
    description: 'Reduced element for 3rd+ children',
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
                  <div className="policy-name">{policy.name}</div>
                  <div className="policy-description">{policy.description}</div>
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
