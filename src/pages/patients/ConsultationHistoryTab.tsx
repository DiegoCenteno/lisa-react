import { memo, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArticleOutlined as LogbookIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import type { SOAPNote } from '../../types';
import { formatDisplayDate } from '../../utils/date';

interface Props {
  soapNotes: SOAPNote[];
  canEditConsultationHistory: boolean;
  onNavigateToBitacora: () => void;
  onEditNote: (note: SOAPNote) => void;
}

function ConsultationHistoryTabInner({ soapNotes, canEditConsultationHistory, onNavigateToBitacora, onEditNote }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return soapNotes;
    const query = searchQuery.toLowerCase();
    return soapNotes.filter(
      (note) =>
        note.subjective?.toLowerCase().includes(query) ||
        note.objective?.toLowerCase().includes(query) ||
        note.assessment?.toLowerCase().includes(query) ||
        note.plan?.toLowerCase().includes(query) ||
        note.private_comments?.toLowerCase().includes(query)
    );
  }, [soapNotes, searchQuery]);

  const paginatedNotes = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredNotes.slice(start, start + rowsPerPage);
  }, [filteredNotes, page, rowsPerPage]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Histórico de Consultas
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<LogbookIcon />}
            onClick={onNavigateToBitacora}
          >
            Bitácora
          </Button>
        </Box>
        <TextField
          fullWidth
          placeholder="Buscar en motivo, análisis, plan o notas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        {soapNotes.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No hay consultas registradas
          </Typography>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell>Resumen</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedNotes.map((note) => (
                    <TableRow key={note.consultation_id ?? note.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {formatDisplayDate(note.created_at)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography sx={{ fontSize: '0.92rem', color: '#333' }}>
                          {note.subjective || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 520 }}>
                        <Typography sx={{ fontSize: '0.9rem', color: '#59636e' }}>
                          {[note.objective, note.assessment, note.plan, note.private_comments].filter(Boolean).join(' | ') || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onEditNote(note)}
                          disabled={!canEditConsultationHistory}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedNotes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No se encontraron consultas
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredNotes.length}
              page={page}
              onPageChange={(_event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Filas"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(ConsultationHistoryTabInner);
