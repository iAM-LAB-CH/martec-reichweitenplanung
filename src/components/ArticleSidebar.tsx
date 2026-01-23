'use client';

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Article } from '@/lib/types';
import HistoryLog from './HistoryLog';

interface ArticleSidebarProps {
  article: Article;
}

export default function ArticleSidebar({
  article,
}: ArticleSidebarProps) {
  return (
    <Box
      sx={{
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Bestellvorschlag Section */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 500,
              px: 2,
              py: 1.5,
              color: 'text.primary',
              fontSize: '0.875rem',
            }}
          >
            Bestellvorschlag
          </Typography>
          <Box sx={{ display: 'flex', px: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Einheiten
              </Typography>
              <Typography variant="body1">
                {article.bestellvorschlag.einheiten.toLocaleString('de-CH')}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Bestellfrist
              </Typography>
              <Typography variant="body1">
                {article.bestellvorschlag.bestellfrist}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Artikel Details Section */}
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 500,
              px: 2,
              py: 1.5,
              color: 'text.primary',
              fontSize: '0.875rem',
            }}
          >
            Artikel Details
          </Typography>
          <List dense sx={{ px: 1 }}>
            <ListItem>
              <ListItemText
                primary="Mindestbestellmenge"
                secondary={article.artikelDetails.mindestbestellmenge.toLocaleString('de-CH')}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Lieferzeit"
                secondary={article.artikelDetails.lieferzeit}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Bestellfrist"
                secondary={article.artikelDetails.bestellfrist}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Erschöpfungsprognose"
                secondary={article.artikelDetails.erschoepfungsprognose}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Mindesthaltbarkeit"
                secondary={article.artikelDetails.mindesthaltbarkeit}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Einheiten pro Palett"
                secondary={article.artikelDetails.einheitenProPalett.toLocaleString('de-CH')}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Lagerkosten pro Einheit"
                secondary={`CHF ${article.artikelDetails.lagerkostenProEinheit.toFixed(2)}`}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
              />
            </ListItem>
          </List>
        </Box>

        <Divider />

        {/* Änderungsverlauf Section */}
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 500,
              px: 2,
              py: 1.5,
              color: 'text.primary',
              fontSize: '0.875rem',
            }}
          >
            Änderungsverlauf
          </Typography>
          <HistoryLog articleId={article.id} />
        </Box>
      </Box>
    </Box>
  );
}

