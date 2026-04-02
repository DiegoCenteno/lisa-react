import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Skeleton,
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
import { Search as SearchIcon } from '@mui/icons-material';
import { consultationService } from '../../api/consultationService';
import type { ConsultationListItem } from '../../types';
import { formatDisplayDate } from '../../utils/date';

function formatPhone(phone?: string) {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function normalizeSearchText(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function truncateText(value?: string, limit: number = 140) {
  if (!value) return '-';
  return value.length > limit ? `${value.slice(0, limit).trim()}...` : value;
}

export default function ConsultationsPage() {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<ConsultationListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const loadConsultations = async () => {
      setLoading(true);
      try {
        const data = await consultationService.getLatestConsultations();
        setConsultations(data);
      } catch (error) {
        console.error('Error cargando consultas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConsultations();
  }, []);

  const filteredConsultations = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return consultations;

    const tokens = query.split(/\s+/).filter(Boolean);
    return consultations.filter((consultation) => {
      const searchable = normalizeSearchText(
        [
          consultation.patient_name,
          consultation.phone,
          consultation.brief_summary,
        ].join(' ')
      );

      return tokens.every((token) => searchable.includes(token));
    });
  }, [consultations, searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const paginatedConsultations = filteredConsultations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Consultas
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
            size="small"
          />
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent>
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} height={50} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Paciente</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Fecha de Nacimiento</TableCell>
                    <TableCell>Última consulta</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedConsultations.map((consultation) => (
                    <TableRow key={consultation.consultation_id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {consultation.patient_name}
                      </TableCell>
                      <TableCell>{formatPhone(consultation.phone)}</TableCell>
                      <TableCell>{consultation.birth_date ? formatDisplayDate(consultation.birth_date) : '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 420 }}>
                        <Typography sx={{ fontSize: '0.85rem', color: '#666', mb: 0.5 }}>
                          {formatDisplayDate(consultation.last_consultation_at)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.92rem', color: '#333' }}>
                          {truncateText(consultation.brief_summary)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => navigate(`/pacientes/${consultation.patient_id}`)}
                          sx={{
                            backgroundColor: '#394b63',
                            '&:hover': { backgroundColor: '#314157' },
                            textTransform: 'none',
                            minWidth: 96,
                          }}
                        >
                          Seleccionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {paginatedConsultations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
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
              count={filteredConsultations.length}
              page={page}
              onPageChange={(_event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Filas por página"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Card>
    </Box>
  );
}
