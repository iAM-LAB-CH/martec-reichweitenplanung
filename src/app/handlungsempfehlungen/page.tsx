'use client';

import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  TableSortLabel,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import StatusChip from '@/components/StatusChip';
import ForecastTable from '@/components/ForecastTable';
import { getArticlesSortedByCriticality } from '@/lib/dummyData';
import { Article, ArticleStatus } from '@/lib/types';

type SortColumn = 'artikelNr' | 'bezeichnung' | 'status' | 'oosIn' | 'lagerDelta' | 'bestellenBis';
type SortDirection = 'asc' | 'desc';

const statusOrder: Record<ArticleStatus, number> = {
  kritisch: 0,
  planen: 1,
  beobachten: 2,
};

// Extract week number from KW string (e.g., "KW17" -> 17)
const extractWeekNumber = (kwString: string): number => {
  return parseInt(kwString.replace('KW', ''), 10) || 0;
};

export default function HandlungsempfehlungenPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['1']));
  const [displayedCount, setDisplayedCount] = useState(20);
  const [sortColumn, setSortColumn] = useState<SortColumn>('bestellenBis');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const loaderRef = useRef<HTMLDivElement>(null);

  const articles = useMemo(() => getArticlesSortedByCriticality(), []);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        searchQuery === '' ||
        article.artikelNr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.bezeichnung.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === '' || article.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [articles, searchQuery, statusFilter]);

  // Sort articles
  const sortedArticles = useMemo(() => {
    return [...filteredArticles].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'artikelNr':
          comparison = a.artikelNr.localeCompare(b.artikelNr);
          break;
        case 'bezeichnung':
          comparison = a.bezeichnung.localeCompare(b.bezeichnung);
          break;
        case 'status':
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'oosIn':
          comparison = extractWeekNumber(a.oosIn) - extractWeekNumber(b.oosIn);
          break;
        case 'lagerDelta':
          comparison = a.lagerDelta - b.lagerDelta;
          break;
        case 'bestellenBis':
          comparison = extractWeekNumber(a.bestellenBis) - extractWeekNumber(b.bestellenBis);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredArticles, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRowClick = (article: Article) => {
    router.push(`/artikel/${article.id}`);
  };

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedCount < sortedArticles.length) {
          setDisplayedCount((prev) => Math.min(prev + 20, sortedArticles.length));
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [displayedCount, sortedArticles.length]);

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(20);
  }, [searchQuery, statusFilter, sortColumn, sortDirection]);

  const formatDelta = (delta: number) => {
    if (delta > 0) return `+${delta.toLocaleString('de-CH')}`;
    return delta.toLocaleString('de-CH');
  };

  // Returns background color for delta values
  const getDeltaBackgroundColor = (delta: number) => {
    if (delta > 0) return 'rgba(76, 175, 80, 0.15)'; // light green
    if (delta < 0) return 'rgba(244, 67, 54, 0.15)'; // light red
    return 'transparent';
  };

  const displayedArticles = sortedArticles.slice(0, displayedCount);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 0.5 }}>
          Handlungsempfehlungen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Basierend auf der Dringlichkeit zur Handlung werden hier alle Artikel gelistet, welche in Gefahr eines unzureichenden Lagerbestands sind oder bald sein werden.
        </Typography>
      </Box>

      {/* Toolbar */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <TextField
          placeholder="Artikel suchen..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, maxWidth: 400 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">Alle</MenuItem>
            <MenuItem value="kritisch">Kritisch</MenuItem>
            <MenuItem value="planen">Planen</MenuItem>
            <MenuItem value="beobachten">Beobachten</MenuItem>
          </Select>
        </FormControl>
        <IconButton>
          <FilterListIcon />
        </IconButton>
        <Button variant="outlined" startIcon={<DownloadIcon />}>
          Download
        </Button>
        <IconButton>
          <SettingsIcon />
        </IconButton>
      </Box>

      {/* Table */}
      <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
        <Table sx={{ minWidth: 800, tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell sx={{ fontWeight: 500 }}>
                <TableSortLabel
                  active={sortColumn === 'artikelNr'}
                  direction={sortColumn === 'artikelNr' ? sortDirection : 'asc'}
                  onClick={() => handleSort('artikelNr')}
                >
                  Artikel Nr.
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>
                <TableSortLabel
                  active={sortColumn === 'bezeichnung'}
                  direction={sortColumn === 'bezeichnung' ? sortDirection : 'asc'}
                  onClick={() => handleSort('bezeichnung')}
                >
                  Bezeichnung
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>
                <TableSortLabel
                  active={sortColumn === 'status'}
                  direction={sortColumn === 'status' ? sortDirection : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>
                <TableSortLabel
                  active={sortColumn === 'oosIn'}
                  direction={sortColumn === 'oosIn' ? sortDirection : 'asc'}
                  onClick={() => handleSort('oosIn')}
                >
                  OOS in
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>
                <TableSortLabel
                  active={sortColumn === 'lagerDelta'}
                  direction={sortColumn === 'lagerDelta' ? sortDirection : 'asc'}
                  onClick={() => handleSort('lagerDelta')}
                >
                  Lager-Delta
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 500 }}>
                <TableSortLabel
                  active={sortColumn === 'bestellenBis'}
                  direction={sortColumn === 'bestellenBis' ? sortDirection : 'asc'}
                  onClick={() => handleSort('bestellenBis')}
                >
                  Bestellen bis
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedArticles.map((article) => (
              <Fragment key={article.id}>
                <TableRow
                  hover
                  sx={{ 
                    cursor: 'pointer',
                    '& > td': { borderBottom: expandedRows.has(article.id) ? 0 : undefined },
                  }}
                >
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExpand(article.id);
                      }}
                    >
                      {expandedRows.has(article.id) ? (
                        <KeyboardArrowUpIcon />
                      ) : (
                        <KeyboardArrowDownIcon />
                      )}
                    </IconButton>
                  </TableCell>
                  <TableCell 
                    onClick={() => handleRowClick(article)}
                    sx={{ fontWeight: 500 }}
                  >
                    {article.artikelNr}
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(article)}>
                    {article.bezeichnung}
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(article)}>
                    <StatusChip status={article.status} />
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(article)}>
                    {article.oosIn}
                  </TableCell>
                  <TableCell 
                    onClick={() => handleRowClick(article)}
                    sx={{ backgroundColor: getDeltaBackgroundColor(article.lagerDelta) }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.primary',
                        fontWeight: article.lagerDelta !== 0 ? 700 : 400,
                      }}
                    >
                      {formatDelta(article.lagerDelta)}
                    </Typography>
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(article)}>
                    {article.bestellenBis}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 0, px: 0, overflow: 'hidden', maxWidth: 0 }}>
                    <Collapse in={expandedRows.has(article.id)} timeout="auto" unmountOnExit>
                      <Box sx={{ py: 2, px: 2, bgcolor: 'grey.50', overflow: 'hidden', width: '100%' }}>
                        <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                          <ForecastTable weeklyData={article.weeklyData} articleId={article.id} compact variant="detail" />
                        </Box>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Infinite scroll loader */}
      {displayedCount < sortedArticles.length && (
        <Box
          ref={loaderRef}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 3,
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
}

