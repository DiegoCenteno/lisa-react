import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ContentCopy as ContentCopyIcon, Search as SearchIcon } from '@mui/icons-material';
import { patientService } from '../../api/patientService';
import type { Patient } from '../../types';
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

function matchesPatientSearch(patient: Patient, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const searchableValues = [
    patient.name,
    patient.last_name,
    patient.full_name,
    patient.phone,
    formatPhone(patient.phone),
  ];

  const words = searchableValues
    .filter(Boolean)
    .flatMap((value) => normalizeSearchText(value).split(/\s+/).filter(Boolean));
  const combinedText = normalizeSearchText(searchableValues.filter(Boolean).join(' '));

  return tokens.every(
    (token) => combinedText.includes(token) || words.some((word) => word.includes(token))
  );
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      try {
        const data = await patientService.getPatients();
        setPatients(data);
        setFilteredPatients(data);
      } catch (err) {
        console.error('Error cargando pacientes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      setFilteredPatients(
        patients.filter((patient) => matchesPatientSearch(patient, searchQuery))
      );
    }
    setPage(0);
  }, [searchQuery, patients]);

  const paginatedPatients = filteredPatients.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCopyPhone = async (
    event: React.MouseEvent<HTMLButtonElement>,
    phone?: string
  ) => {
    event.stopPropagation();
    if (!phone) return;

    try {
      await navigator.clipboard.writeText(phone);
    } catch (error) {
      console.error('Error copiando telefono:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Pacientes
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
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={50} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        ) : isMobile ? (
          <>
            <List>
              {paginatedPatients.map((patient) => (
                <ListItem
                  key={patient.id}
                  divider
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {patient.name?.[0] ?? '?'}
                      {patient.last_name?.[0] ?? ''}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={patient.full_name ?? `${patient.name} ${patient.last_name}`}
                    secondary={
                      <Box
                        component="span"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
                      >
                        {patient.phone ? (
                          <>
                            <span>{formatPhone(patient.phone)}</span>
                            <IconButton
                              size="small"
                              sx={{ p: 0.25 }}
                              onClick={(event) => handleCopyPhone(event, patient.phone)}
                            >
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </>
                        ) : (
                          <span>Sin datos de contacto</span>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {paginatedPatients.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No se encontraron pacientes"
                    primaryTypographyProps={{ color: 'text.secondary', textAlign: 'center' }}
                  />
                </ListItem>
              )}
            </List>

            <TablePagination
              component="div"
              count={filteredPatients.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Filas por pagina"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Paciente</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Fecha de Nacimiento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPatients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/pacientes/${patient.id}`)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                            {patient.name?.[0] ?? '?'}
                            {patient.last_name?.[0] ?? ''}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {patient.full_name ?? `${patient.name} ${patient.last_name}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2">{formatPhone(patient.phone)}</Typography>
                          {patient.phone && (
                            <IconButton
                              size="small"
                              sx={{ p: 0.25 }}
                              onClick={(event) => handleCopyPhone(event, patient.phone)}
                            >
                              <ContentCopyIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {patient.birth_date
                          ? `${formatDisplayDate(patient.birth_date)}${patient.age ? ` (${patient.age} años)` : ''}`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}

                  {paginatedPatients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No se encontraron pacientes
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredPatients.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Filas por pagina"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Card>
    </Box>
  );
}
