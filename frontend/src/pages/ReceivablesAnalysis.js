// src/pages/ReceivablesAnalysis.js
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Card,
  CardContent,
  useTheme,
  alpha,
  Alert,
  Button
} from '@mui/material';
import { 
  PieChart, 
  Pie, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupsIcon from '@mui/icons-material/Groups';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BusinessIcon from '@mui/icons-material/Business';
import WarningIcon from '@mui/icons-material/Warning';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EnhancedFileUploader from '../components/FileUploader';
import * as XLSX from 'xlsx';
import _ from 'lodash';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

const COLORS = [
  '#4e7bea', // primary main
  '#6d92fd', // primary light
  '#9c27b0', // secondary main
  '#bb4fd3', // secondary light
  '#4caf50', // success main
  '#f44336', // error main
  '#ff9800', // warning main
  '#29b6f6', // info main
  '#e2e8f0', // text primary
  '#94a3b8'  // text secondary
];

const ReceivablesAnalysis = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  // Handle receivables data from file upload
  const handleReceivablesData = (receivablesData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!receivablesData || !receivablesData.raw || receivablesData.raw.length === 0) {
        setError("Geçerli veri bulunamadı.");
        setIsLoading(false);
        return;
      }
      
      const rawData = receivablesData.raw;
      
      // Find amount column
      const firstRow = rawData[0];
      const amountColumn = Object.keys(firstRow).find(key => 
        key.includes('tutar') || key.includes('Tutar')
      );
      
      if (!amountColumn) {
        setError("Tutar içeren sütun bulunamadı.");
        setIsLoading(false);
        return;
      }
      
      // Total receivables amount
      const totalAmount = _.sumBy(rawData, record => parseFloat(record[amountColumn] || 0));
      
      // Receivables distribution by customer
      const customerColumn = Object.keys(firstRow).includes('Cari Adı') ? 'Cari Adı' : 'Müşteri';
      const customerGroups = _.groupBy(rawData, customerColumn);
      const customerSummary = Object.keys(customerGroups).map(customer => {
        const totalCustomerAmount = _.sumBy(customerGroups[customer], record => parseFloat(record[amountColumn] || 0));
        const count = customerGroups[customer].length;
        return {
          name: customer.length > 20 ? customer.substring(0, 20) + '...' : customer,
          amount: totalCustomerAmount,
          count,
          percentage: (totalCustomerAmount / totalAmount) * 100
        };
      });
      
      // Distribution by due date
      const dueDateColumn = Object.keys(firstRow).find(key => 
        key.includes('vade') || key.includes('Vade') || key.includes('tarihi') || key.includes('Tarihi')
      );
      
      if (!dueDateColumn) {
        setError("Vade tarihi içeren sütun bulunamadı. Analiz kısmen tamamlanabilir.");
      }
      
      rawData.forEach(record => {
        if (record[dueDateColumn]) {
          record.dueDate = new Date(record[dueDateColumn]);
        }
      });
      
      const monthlyGroups = _.groupBy(rawData, record => {
        if (record.dueDate) {
          return `${record.dueDate.getFullYear()}-${record.dueDate.getMonth() + 1}`;
        }
        return 'Unknown';
      });
      
      const monthlyData = Object.keys(monthlyGroups)
        .sort()
        .map(month => {
          return {
            name: month,
            amount: _.sumBy(monthlyGroups[month], record => parseFloat(record[amountColumn] || 0)),
            count: monthlyGroups[month].length
          };
        });
      
      // Distribution by document type
      const documentTypeColumn = Object.keys(firstRow).find(key => 
        key.includes('belge') || key.includes('Belge') || key.includes('türü') || key.includes('Türü')
      ) || 'Belge türü';
      
      const documentTypeGroups = _.groupBy(rawData, documentTypeColumn);
      const documentTypeSummary = Object.keys(documentTypeGroups).map(type => {
        return {
          name: type,
          amount: _.sumBy(documentTypeGroups[type], record => parseFloat(record[amountColumn] || 0)),
          count: documentTypeGroups[type].length,
          percentage: (_.sumBy(documentTypeGroups[type], record => parseFloat(record[amountColumn] || 0)) / totalAmount) * 100
        };
      });
      
      // Maturity analysis - based on current date
      const currentDate = new Date();
      
      rawData.forEach(record => {
        if (record.dueDate) {
          // Remaining days = Due date - Current date (in days)
          record.remainingDays = Math.round((record.dueDate - currentDate) / (1000 * 60 * 60 * 24));
        }
      });
      
      const avgDueDate = _.meanBy(rawData.filter(r => r.remainingDays !== undefined), 'remainingDays');
      
      const dueDateRanges = [
        { range: 'Vadesi Geçmiş', min: -Infinity, max: -1 },
        { range: '0-30 gün', min: 0, max: 30 },
        { range: '31-60 gün', min: 31, max: 60 },
        { range: '61-90 gün', min: 61, max: 90 },
        { range: '91+ gün', min: 91, max: Infinity }
      ];
      
      const dueDateDistribution = dueDateRanges.map(range => {
        const filtered = rawData.filter(r => r.remainingDays !== undefined && r.remainingDays >= range.min && r.remainingDays <= range.max);
        return {
          name: range.range,
          count: filtered.length,
          amount: _.sumBy(filtered, record => parseFloat(record[amountColumn] || 0)),
          percentage: (filtered.length / rawData.length) * 100,
          amountPercentage: (_.sumBy(filtered, record => parseFloat(record[amountColumn] || 0)) / totalAmount) * 100
        };
      });
      
      const processedData = {
        totalAmount,
        customerSummary: _.orderBy(customerSummary, ['amount'], ['desc']),
        monthlyData,
        documentTypeSummary,
        dueDateDistribution,
        avgDueDate: isNaN(avgDueDate) ? 0 : avgDueDate,
        rawData
      };
      
      setData(processedData);
      setIsLoading(false);
      
    } catch (error) {
      console.error("Veri işleme hatası:", error);
      setError(`Veri analiz edilirken bir hata oluştu: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Formatting functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `%${value.toFixed(2)}`;
  };

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, boxShadow: 3, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Box key={index} sx={{ color: entry.color, display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" sx={{ mr: 4 }}>
                {entry.name}:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {entry.dataKey === 'amount' 
                  ? formatCurrency(entry.value) 
                  : entry.dataKey === 'percentage' || entry.dataKey === 'amountPercentage'
                    ? formatPercentage(entry.value)
                    : entry.value}
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // If there's no data and not loading, show the upload form
  if (!data && !isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.secondary.dark, 0.8)})`,
            color: 'white',
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.dark, 0.4)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssessmentIcon sx={{ fontSize: 36, mr: 2 }} />
            <Typography variant="h4" fontWeight="500">
              Alacak Portföy Analizi
            </Typography>
          </Box>
          <Typography variant="subtitle1" sx={{ opacity: 0.9, mb: 2 }}>
            Alacak verilerinizi analiz etmek için Excel dosyanızı yükleyin
          </Typography>
        </Paper>
        
        <Box sx={{ mb: 4 }}>
          <EnhancedFileUploader 
            onReceivablesAnalysisData={handleReceivablesData}
          />
        </Box>
      </Container>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ 
        mt: 4, 
        mb: 4, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '80vh'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h5" sx={{ mt: 2 }}>Veriler Analiz Ediliyor...</Typography>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
        
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
            startIcon={<UploadFileIcon />}
          >
            Yeniden Dosya Yükle
          </Button>
        </Box>
      </Container>
    );
  }

  // Main content when data is loaded
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.secondary.dark, 0.8)})`,
          color: 'white',
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.dark, 0.4)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AssessmentIcon sx={{ fontSize: 36, mr: 2 }} />
          <Typography variant="h4" fontWeight="500">
            Alacak Portföy Analizi
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ opacity: 0.9, mb: 2 }}>
          Analiz {new Date().toLocaleDateString('tr-TR')} tarihinde gerçekleştirildi
        </Typography>
        
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: alpha(theme.palette.background.paper, 0.15), backdropFilter: 'blur(10px)' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, color: alpha('#fff', 0.7) }}>
                  Toplam Alacak Tutarı
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.light">
                  {formatCurrency(data.totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: alpha(theme.palette.background.paper, 0.15), backdropFilter: 'blur(10px)' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, color: alpha('#fff', 0.7) }}>
                  Ortalama Kalan Vade
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.light">
                  {Math.round(data.avgDueDate)} gün
                </Typography>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
                  {new Date().toLocaleDateString('tr-TR')} tarihinden itibaren
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: alpha(theme.palette.background.paper, 0.15), backdropFilter: 'blur(10px)' }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, color: alpha('#fff', 0.7) }}>
                  Toplam Müşteri Sayısı
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="secondary.light">
                  {data.customerSummary.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      <Grid container spacing={4}>
        {/* Customer Distribution */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.8)
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <BusinessIcon sx={{ color: theme.palette.primary.main, mr: 1.5 }} />
              <Typography variant="h6" fontWeight="medium">
                Müşteri Dağılımı (İlk 5)
              </Typography>
            </Box>
            
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.customerSummary.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="name"
                    label={({ name, percentage }) => `${name}: %${percentage.toFixed(1)}`}
                  >
                    {data.customerSummary.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Müşteri</TableCell>
                    <TableCell align="right">Tutar</TableCell>
                    <TableCell align="right">Yüzde</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.customerSummary.slice(0, 5).map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell align="right">{formatCurrency(customer.amount)}</TableCell>
                      <TableCell align="right">{formatPercentage(customer.percentage)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Maturity Distribution */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.8)
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <CalendarMonthIcon sx={{ color: theme.palette.secondary.main, mr: 1.5 }} />
              <Typography variant="h6" fontWeight="medium">
                Vade Dağılımı
              </Typography>
            </Box>
            
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.monthlyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="amount" name="Tutar" fill={theme.palette.secondary.main} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ay</TableCell>
                    <TableCell align="right">Tutar</TableCell>
                    <TableCell align="right">İşlem Sayısı</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.monthlyData.map((month, index) => (
                    <TableRow key={index}>
                      <TableCell>{month.name}</TableCell>
                      <TableCell align="right">{formatCurrency(month.amount)}</TableCell>
                      <TableCell align="right">{month.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Document Type Distribution */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.8)
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <DescriptionIcon sx={{ color: theme.palette.info.main, mr: 1.5 }} />
              <Typography variant="h6" fontWeight="medium">
                Belge Türü Dağılımı
              </Typography>
            </Box>
            
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.documentTypeSummary}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="name"
                    label={({ name, percentage }) => `${name}: %${percentage.toFixed(1)}`}
                  >
                    {data.documentTypeSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Belge Türü</TableCell>
                    <TableCell align="right">Tutar</TableCell>
                    <TableCell align="right">İşlem Sayısı</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.documentTypeSummary.map((type, index) => (
                    <TableRow key={index}>
                      <TableCell>{type.name}</TableCell>
                      <TableCell align="right">{formatCurrency(type.amount)}</TableCell>
                      <TableCell align="right">{type.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Remaining Days Distribution */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              height: '100%',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.8)
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <ReceiptLongIcon sx={{ color: theme.palette.warning.main, mr: 1.5 }} />
              <Typography variant="h6" fontWeight="medium">
                Kalan Gün Dağılımı ({new Date().toLocaleDateString('tr-TR')} itibariyle)
              </Typography>
            </Box>
            
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.dueDateDistribution}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="amount" name="Tutar" fill={theme.palette.warning.main} />
                  <Bar dataKey="count" name="İşlem Sayısı" fill={theme.palette.warning.light} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kalan Gün</TableCell>
                    <TableCell align="right">Tutar</TableCell>
                    <TableCell align="right">Yüzde</TableCell>
                    <TableCell align="right">İşlem Sayısı</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.dueDateDistribution.map((range, index) => (
                    <TableRow key={index}>
                      <TableCell>{range.name}</TableCell>
                      <TableCell align="right">{formatCurrency(range.amount)}</TableCell>
                      <TableCell align="right">{formatPercentage(range.amountPercentage)}</TableCell>
                      <TableCell align="right">{range.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Securitization Risk Analysis */}
        <Grid item xs={12}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.8)
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <WarningIcon sx={{ color: theme.palette.error.main, mr: 1.5 }} />
              <Typography variant="h6" fontWeight="medium">
                Menkul Kıymetleştirme Risk Analizi
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    borderColor: alpha(theme.palette.error.main, 0.3),
                    bgcolor: alpha(theme.palette.error.main, 0.05)
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Yoğunlaşma Riski
                  </Typography>
                  <Typography variant="h5" color="error.main" fontWeight="bold" sx={{ mb: 1 }}>
                    {formatPercentage(data.customerSummary[0]?.percentage || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    En büyük müşterinin toplam alacaklar içindeki yüzdesi
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Vade Profili
                  </Typography>
                  <Typography variant="h5" color="primary.main" fontWeight="bold" sx={{ mb: 1 }}>
                    {data.dueDateDistribution.find(d => d.name === '91+ gün')?.amountPercentage 
                      ? formatPercentage(data.dueDateDistribution.find(d => d.name === '91+ gün').amountPercentage) 
                      : '%0'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vadesi 91 günden fazla olan alacakların yüzdesi
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    borderColor: alpha(theme.palette.success.main, 0.3),
                    bgcolor: alpha(theme.palette.success.main, 0.05)
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Belge Türü Çeşitliliği
                  </Typography>
                  <Typography variant="h5" color="success.main" fontWeight="bold" sx={{ mb: 1 }}>
                    {data.documentTypeSummary.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Farklı belge türlerinin sayısı
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            <Box sx={{ 
              mt: 3, 
              p: 2, 
              bgcolor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 1
            }}>
              <Typography variant="subtitle1" gutterBottom color="info.main">
                Menkul Kıymetleştirme Değerlendirmesi
              </Typography>
              <Typography variant="body2" paragraph>
                Portföy, en büyük müşteri nedeniyle {formatPercentage(data.customerSummary[0]?.percentage || 0)} oranında bir yoğunlaşma riski göstermektedir. 
                Menkul kıymetleştirme yapıları genellikle bu riski azaltmak için kredi geliştirme mekanizmaları içerir.
              </Typography>
              <Typography variant="body2" paragraph>
                Uzun vadeli alacaklar (91+ gün) portföyün {data.dueDateDistribution.find(d => d.name === '91+ gün')?.amountPercentage 
                  ? formatPercentage(data.dueDateDistribution.find(d => d.name === '91+ gün').amountPercentage) 
                  : '%0'}'sini oluşturmaktadır, bu da menkul kıymetleştirme dilimlerinin vade yapısını etkilemektedir.
              </Typography>
              <Typography variant="body2">
                Ortalama kalan vade olan {Math.round(data.avgDueDate)} gün, menkul kıymetleştirmenin ömrü boyunca uygun kredi geliştirme seviyelerini 
                korumak için ödeme şelalesi ve dilim yapılarını tasarlarken dikkate alınmalıdır.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Upload Again Button */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => window.location.reload()}
          startIcon={<UploadFileIcon />}
        >
          Başka Bir Dosya Yükle
        </Button>
      </Box>
    </Container>
  );
};

export default ReceivablesAnalysis;