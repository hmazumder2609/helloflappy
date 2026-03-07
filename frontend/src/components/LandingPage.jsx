import React from 'react';

const LandingPage = () => {
  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>Welcome to Our Platform</h1>
          <p style={styles.heroSubtitle}>Build amazing things with our cutting-edge tools</p>
          <div style={styles.heroButtons}>
            <button style={styles.btnPrimary}>Get Started</button>
            <button style={styles.btnSecondary}>Learn More</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.featuresSection}>
        <h2>Our Features</h2>
        <div style={styles.featuresGrid}>
          {[
            { title: 'Fast Performance', icon: '⚡' },
            { title: 'Modern Design', icon: '🎨' },
            { title: 'Secure Platform', icon: '🔒' }
          ].map((feature, index) => (
            <div key={index} style={styles.featureCard}>
              <span style={styles.featureIcon}>{feature.icon}</span>
              <h3>{feature.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section style={styles.ctaSection}>
        <h2>Ready to Start?</h2>
        <button style={styles.btnPrimary}>Join Us Now</button>
      </section>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f7fa',
    minHeight: '100vh'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '8rem 2rem',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto',
    position: 'relative',
    zIndex: '1'
  },
  heroTitle: {
    fontSize: '4rem',
    fontWeight: 'bold',
    marginBottom: '2rem',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  },
  heroSubtitle: {
    fontSize: '1.5rem',
    marginBottom: '3rem',
    opacity: '0.9'
  },
  heroButtons: {
    display: 'flex',
    gap: '2rem',
    justifyContent: 'center'
  },
  btnPrimary: {
    padding: '1rem 3rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    backgroundColor: '#ffffff',
    color: '#667eea',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  btnSecondary: {
    padding: '1rem 3rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: '#ffffff',
    border: '2px solid #ffffff',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  featuresSection: {
    padding: '6rem 2rem',
    textAlign: 'center'
  },
  featuresGrid: {
    display: 'flex',
    gap: '2rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '3rem'
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    width: '280px',
    transition: 'transform 0.3s ease'
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  ctaSection: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    padding: '4rem 2rem',
    textAlign: 'center'
  }
};

export default LandingPage;