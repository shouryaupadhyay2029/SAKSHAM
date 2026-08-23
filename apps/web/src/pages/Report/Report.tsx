import React, { useState } from 'react';
import { useOperationalState } from '../../context/OperationalStateContext';
import { Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Report.module.css';
import { ShaderBackground } from '../../components/ui/ShaderBackground';
import { AddressPicker } from '../../components/ui/AddressPicker';

export const Report: React.FC = () => {
  const { addIncidentFromSOS } = useOperationalState();
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    zone: 'Central Delhi',
    need: 'Rations & Drinking Water',
    details: ''
  });

  const [locationData, setLocationData] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.details) {
      alert('Please fill in all required fields.');
      return;
    }
    if (!locationData || !locationConfirmed) {
      alert('Please search for or select a location on the map, and confirm it before submitting.');
      return;
    }
    const reqId = addIncidentFromSOS({
      ...formData,
      latitude: locationData.lat,
      longitude: locationData.lng,
      address: locationData.address
    });
    setTicketId(reqId);
    setSubmitted(true);
  };

  return (
    <div className={styles.pageWrapper}>
      <ShaderBackground className="absolute inset-0" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
      
      <div className={styles.container}>
        {/* Left Column: Form & Registry Header */}
        <div className={styles.formCol}>
          <div>
            <div className="mb-4">
              <Link to="/" className={styles.backPortalLink}>
                <ArrowLeft size={16} /> Back to civilian portal
              </Link>
            </div>

            <div className={styles.header}>
              <h2>Emergency SOS Incident Registry</h2>
              <p className={styles.subtext}>
                Submit a localized request for immediate rescue, medical assistance, or relief materials.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            {submitted ? (
              <div className={styles.successCard}>
                <CheckCircle size={48} className={styles.successIcon} />
                <h3 className={styles.successTitle}>SOS Dispatch Ticket Registered</h3>
                <p>
                  Your emergency report has been routed to the Delhi Central Command Desk. Responders have been signaled.
                </p>
                <div className={styles.ticketCode}>
                  Ticket ID: {ticketId}
                </div>
                <button 
                  className={styles.backLink}
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      name: '',
                      phone: '',
                      zone: 'Central Delhi',
                      need: 'Rations & Drinking Water',
                      details: ''
                    });
                    setLocationData(null);
                    setLocationConfirmed(false);
                  }}
                >
                  Submit another emergency report
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Full Name / Contact Person *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="E.g., Rajesh Kumar" 
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Emergency Mobile Number *</label>
                  <input 
                    type="tel" 
                    required
                    placeholder="E.g., +91 98765 43210" 
                    className={styles.input}
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Affected District Zone *</label>
                    <select 
                      className={styles.select}
                      value={formData.zone}
                      onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
                    >
                      <option value="Central Delhi">Central Delhi</option>
                      <option value="East Delhi">East Delhi (Yamuna Banks)</option>
                      <option value="West Delhi">West Delhi</option>
                      <option value="North Delhi">North Delhi</option>
                      <option value="South Delhi">South Delhi</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Primary Urgent Need *</label>
                    <select 
                      className={styles.select}
                      value={formData.need}
                      onChange={(e) => setFormData(prev => ({ ...prev, need: e.target.value }))}
                    >
                      <option value="Rations & Drinking Water">Rations & Drinking Water</option>
                      <option value="Medical Assistance / First Aid">Medical Assistance / First Aid</option>
                      <option value="Structural Evacuation / Rescue Boat">Structural Evacuation / Rescue Boat</option>
                      <option value="Blankets & Temporary Bedding">Blankets & Temporary Bedding</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Incident Location & Map Verification *</label>
                  <AddressPicker 
                    onChange={(data, confirmed) => {
                      setLocationData(data);
                      setLocationConfirmed(confirmed);
                    }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Situation Details / Remarks *</label>
                  <textarea 
                    required
                    placeholder="Describe the level of flooding, structural state, or counts of elderly/children stranded..." 
                    className={styles.textarea}
                    value={formData.details}
                    onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  <Send size={18} /> SUBMIT SOS REQUEST
                </button>
              </form>
            )}
          </div>
          
          <div className={styles.securityNote}>
            <span className={styles.shieldIcon}>🛡️</span>
            <span>Your information is secure and will be used only for emergency response and relief operations.</span>
          </div>
        </div>

        {/* Right Column: Visual Image with EOC layout */}
        <div className={styles.visualCol}>
          <img src="/sos.png" alt="Emergency Rescue Operations" className={styles.visualImage} />
          <div className={styles.visualGridOverlay} />
        </div>
      </div>
    </div>
  );
};

export default Report;
