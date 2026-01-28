'use client';

import { useMemo, useEffect, useCallback } from 'react';
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
  Badge,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LinkIcon from '@mui/icons-material/Link';
import StatusChip from '@/components/StatusChip';
import LagerbestandProjection from '@/components/LagerbestandProjection';
import OrdersSection from '@/components/OrdersSection';
import ArticleSidebar from '@/components/ArticleSidebar';
import {
  getArticleById,
  getNextArticleId,
  getPreviousArticleId,
} from '@/lib/dummyData';
import { usePOLink } from '@/lib/POLinkContext';

export default function ArtikelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  const article = useMemo(() => getArticleById(articleId), [articleId]);
  const nextId = useMemo(() => getNextArticleId(articleId), [articleId]);
  const prevId = useMemo(() => getPreviousArticleId(articleId), [articleId]);

  // PO linking state from context
  const { getUnlinkedPOs, linkPO, initializeFromArticle } = usePOLink();

  // Initialize PO link state when article loads
  useEffect(() => {
    if (article) {
      initializeFromArticle(article);
    }
  }, [article, initializeFromArticle]);

  // Get unlinked POs from context
  const unlinkedPOs = useMemo(() => {
    return getUnlinkedPOs(articleId);
  }, [getUnlinkedPOs, articleId]);

  const handleLinkPO = useCallback((week: string, poNummer: string) => {
    linkPO(articleId, week, poNummer);
  }, [articleId, linkPO]);

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

  // Format number in Swiss German format
  const formatNumber = (num: number) => {
    return num.toLocaleString('de-CH');
  };

  // Color for Lagerbestand Ende
  const getLagerbestandColor = (value: number) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.primary';
  };

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {unlinkedPOs.length > 0 && (
                <Badge badgeContent={unlinkedPOs.length} color="warning">
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.5,
                      py: 0.5,
                      bgcolor: 'warning.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'warning.main',
                    }}
                  >
                    <LinkIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 500 }}>
                      Unverknüpfte POs
                    </Typography>
                  </Box>
                </Badge>
              )}
              <StatusChip status={article.status} size="medium" />
            </Box>
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
                  Lagerbestand (Ende KW)
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 500,
                    color: getLagerbestandColor(article.lagerbestandEnde),
                  }}
                >
                  {formatNumber(article.lagerbestandEnde)}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="body2" color="text.secondary">
                  Bestellen bis
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {article.bestellenBis}
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

          {/* Forecast Table Section */}
          <Box sx={{ p: 3 }}>
            <LagerbestandProjection
              weeklyData={article.weeklyData}
              articleId={article.id}
              variant="detail"
              unlinkedPOs={unlinkedPOs}
              onLinkPO={handleLinkPO}
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
