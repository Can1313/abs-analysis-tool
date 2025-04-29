// src/components/FileUploader.js
import React, { useState } from "react";
import { 
  Box, 
  Button, 
  Typography, 
  Alert, 
  Paper, 
  CircularProgress,
  alpha,
  useTheme
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { uploadFile } from "../services/apiService";
import { useData } from "../contexts/DataContext";

const FileUploader = () => {
  const { setCashFlowData, setIsLoading, setError, isLoading, error, cashFlowData } = useData();
  const theme = useTheme();

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await uploadFile(file);
      setCashFlowData(data);
    } catch (error) {
      setError('Failed to upload file. Please check the file format and try again.');
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', my: 3 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            '& .MuiAlert-icon': {
              alignItems: 'center'
            }
          }}
        >
          {error}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Box
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          sx={{
            border: '2px dashed',
            borderColor: dragActive 
                ? theme.palette.primary.main
                : alpha(theme.palette.primary.main, 0.3),
            borderRadius: 2,
            p: 4,
            mb: 3,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            backgroundColor: dragActive 
              ? alpha(theme.palette.primary.main, 0.15)
              : alpha(theme.palette.background.paper, 0.4),
            '&:hover': {
              borderColor: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.1)
            }
          }}
          onClick={() => document.getElementById('file-upload').click()}
        >
          <input
            type="file"
            id="file-upload"
            accept=".xlsx,.xls"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          {!file ? (
            <>
              <CloudUploadIcon sx={{ 
                fontSize: 64, 
                color: theme.palette.primary.main, 
                mb: 2, 
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }} />
              <Typography variant="h6" gutterBottom fontWeight="medium" color="primary.main">
                Drag and drop your Excel file here
              </Typography>
              <Typography variant="body1" color="text.secondary">
                or click to browse files
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ 
                mt: 2, 
                opacity: 0.8
              }}>
                Supported formats: .xlsx, .xls
              </Typography>
            </>
          ) : (
            <>
              <DescriptionOutlinedIcon sx={{ 
                fontSize: 50, 
                color: theme.palette.primary.main, 
                mb: 2,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }} />
              <Typography variant="h6" gutterBottom color="primary.main">
                File selected
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {file.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Size: {(file.size / 1024).toFixed(1)} KB
              </Typography>
              <Typography variant="body2" color="primary.main" sx={{ mt: 2 }}>
                Click to select a different file
              </Typography>
            </>
          )}
        </Box>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={!file || isLoading}
          size="large"
          sx={{
            py: 1.5,
            fontWeight: 500,
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            background: isLoading ? 
              'linear-gradient(45deg, #4e7bea, #6d92fd)' : 
              'linear-gradient(45deg, #4e7bea, #3461c7)',
            '&:hover': {
              boxShadow: '0 6px 10px rgba(0,0,0,0.4)',
              background: 'linear-gradient(45deg, #5d8aff, #4e7bea)'
            }
          }}
          startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <UploadFileIcon />}
        >
          {isLoading ? 'Processing...' : 'Upload and Process'}
        </Button>
      </form>
      
      {/* Display data summary after upload */}
      {cashFlowData && !isLoading && !error && (
        <Paper 
          elevation={2} 
          sx={{ 
            mt: 4, 
            p: 3, 
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
            background: `linear-gradient(to right, ${alpha(theme.palette.success.dark, 0.1)}, ${alpha(theme.palette.success.main, 0.05)})`,
            boxShadow: `0 4px 12px ${alpha(theme.palette.success.dark, 0.25)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DescriptionOutlinedIcon sx={{ 
              color: theme.palette.success.main, 
              mr: 1,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
            }} />
            <Typography variant="h6" color="success.main" fontWeight="medium">
              File Uploaded Successfully
            </Typography>
          </Box>
          
          <Box sx={{ 
            mt: 2,
            p: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            borderRadius: 1,
            boxShadow: `0 2px 8px ${alpha('#000', 0.2)}`
          }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Summary
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Records</Typography>
                <Typography variant="h6">{cashFlowData.total_records}</Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">Total Receivables</Typography>
                <Typography variant="h6">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(cashFlowData.total_principal)}</Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">Total Interest</Typography>
                <Typography variant="h6">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(cashFlowData.total_interest)}</Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">Total Cash Flow</Typography>
                <Typography variant="h6">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(cashFlowData.total_cash_flow)}</Typography>
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <b>Date Range:</b> {cashFlowData.date_range[0]} - {cashFlowData.date_range[1]}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default FileUploader;