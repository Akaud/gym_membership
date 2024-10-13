import React from "react";
import '../styles.css';
const Footer = () => {
  return (
    <footer className="footer" style={{ backgroundColor: '#00d1b2', color: 'black', padding: '20px', textAlign: 'center' }}>
      <div className="content">
        <p>
          &copy; {new Date().getFullYear()} Gym Membership. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;