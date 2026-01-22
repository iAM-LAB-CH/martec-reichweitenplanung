'use client';

import { useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Divider,
  Card,
  CardContent,
  Fab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StatusChip from '@/components/StatusChip';
import LagerbestandProjection from '@/components/LagerbestandProjection';
import OrdersSection from '@/components/OrdersSection';
import ArticleSidebar from '@/components/ArticleSidebar';
import {
  getArticleById,
  getNextArticleId,
  getPreviousArticleId,
} from '@/lib/dummyData';

export default function ArtikelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  const article = useMemo(() => getArticleById(articleId), [articleId]);
  const nextId = useMemo(() => getNextArticleId(articleId), [articleId]);
  const prevId = useMemo(() => getPreviousArticleId(articleId), [articleId]);

  if (!article) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Artikel nicht gefunden</Typography>
      </Box>
    );
  }

  const handleNext = () => {
    if (nextId) router.push(`/artikel/${nextId}`);
  };

  const handlePrevious = () => {
    if (prevId) router.push(`/artikel/${prevId}`);
  };

  // Calculate OOS metrics from weekly data
  const oosMetrics = article.weeklyData
    .filter((w) => w.lagerbestand === 0)
    .slice(0, 3)
    .map((w) => ({
      week: w.week,
      bestellfrist: article.artikelDetails.bestellfrist,
    }));

  // If no OOS yet, show upcoming critical week
  const upcomingOOS = article.weeklyData.find((w) => w.lagerDelta < 0);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
      {/* Main Content */}
      <Box sx={{ flex: 1, p: 4, mr: '360px', overflowY: 'auto', overflowX: 'hidden', maxWidth: 'calc(100vw - 360px)' }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            href="/handlungsempfehlungen"
            underline="hover"
            color="inherit"
            onClick={(e) => {
              e.preventDefault();
              router.push('/handlungsempfehlungen');
            }}
            sx={{ cursor: 'pointer' }}
          >
            Handlungsempfehlungen
          </Link>
          <Typography color="text.primary">{article.bezeichnung}</Typography>
        </Breadcrumbs>

        {/* Article Header */}
        <Paper sx={{ mb: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  IMG
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {article.bezeichnung}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {article.artikelNr}
                </Typography>
              </Box>
            </Box>
            <StatusChip status={article.status} size="medium" />
          </Box>

          {/* Metric Cards */}
          <Box
            sx={{
              display: 'flex',
              p: 2,
              gap: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" color="text.secondary">
                  OOS in
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {article.oosIn}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" color="text.secondary">
                  Bestellfrist
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {article.artikelDetails.bestellfrist}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" color="text.secondary">
                  Bestellfrist
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {article.artikelDetails.bestellfrist}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" color="text.secondary">
                  Bestellfrist
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {article.artikelDetails.bestellfrist}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Chart Section */}
          <Box sx={{ p: 3 }}>
            <LagerbestandProjection
              weeklyData={article.weeklyData}
              articleId={article.id}
              currentWeekIndex={12} // KW13 is index 12 (current week)
              variant="detail"
            />
          </Box>

          <Divider />

          {/* Orders Section */}
          <Box sx={{ p: 3 }}>
            <OrdersSection
              articleId={article.id}
              einkauf={article.orders.einkauf}
              verkauf={article.orders.verkauf}
            />
          </Box>
        </Paper>
      </Box>

      {/* Fixed Sidebar */}
      <Box
        sx={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: 360,
          height: '100vh',
          borderLeft: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'auto',
          zIndex: 1200,
        }}
      >
        <ArticleSidebar article={article} />
      </Box>

      {/* Floating Navigation FABs */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 384,
          display: 'flex',
          gap: 2,
          zIndex: 1300,
        }}
      >
        <Fab
          variant="extended"
          color="inherit"
          onClick={handlePrevious}
          disabled={!prevId}
          sx={{
            bgcolor: 'grey.300',
            '&:hover': { bgcolor: 'grey.400' },
            '&.Mui-disabled': { bgcolor: 'grey.200' },
            textTransform: 'uppercase',
            fontSize: '0.8125rem',
            px: 2,
          }}
        >
          <ArrowBackIcon sx={{ mr: 1 }} />
          Vorheriger Artikel
        </Fab>
        <Fab
          variant="extended"
          color="inherit"
          onClick={handleNext}
          disabled={!nextId}
          sx={{
            bgcolor: 'grey.300',
            '&:hover': { bgcolor: 'grey.400' },
            '&.Mui-disabled': { bgcolor: 'grey.200' },
            textTransform: 'uppercase',
            fontSize: '0.8125rem',
            px: 2,
          }}
        >
          Nächster Artikel
          <ArrowForwardIcon sx={{ ml: 1 }} />
        </Fab>
      </Box>
    </Box>
  );
}

