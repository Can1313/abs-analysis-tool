// src/components/Footer.js
import React from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Link, 
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

const Footer = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();
  
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        mt: 'auto',
        borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        background: `linear-gradient(to right, ${theme.palette.background.default}, ${alpha(theme.palette.primary.dark, 0.1)}, ${theme.palette.background.default})`,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ReceiptLongIcon sx={{ fontSize: 24, color: theme.palette.primary.main, mr: 1 }} />
            <Typography variant="h6" color="primary.main" fontWeight="medium">
              Receivables Securitization Platform
            </Typography>
          </Box>
          
          <Divider sx={{ width: '40px', mb: 2, borderColor: alpha(theme.palette.primary.main, 0.3) }} />
          
          <Typography variant="body2" color="text.secondary" align="center">
            © {currentYear} Receivables Securitization Platform | All Rights Reserved
          </Typography>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
            <Link href="#" color="text.secondary" sx={{ 
              textDecoration: 'none',
              '&:hover': { color: theme.palette.primary.main }
            }}>
              Terms of Service
            </Link>
            <Link href="#" color="text.secondary" sx={{ 
              textDecoration: 'none', 
              '&:hover': { color: theme.palette.primary.main }
            }}>
              Privacy Policy
            </Link>
            <Link href="#" color="text.secondary" sx={{ 
              textDecoration: 'none',
              '&:hover': { color: theme.palette.primary.main }
            }}>
              Contact Us
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;