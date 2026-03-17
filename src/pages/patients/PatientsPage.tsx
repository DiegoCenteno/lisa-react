import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  InputAdornment,
  Skeleton,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { patientService } from '../../api/patientService';
import type { Patient } from '../../types';

export default function PatientsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPatients = async () => {
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
      const q = searchQuery.toLowerCase();
      setFilteredPatients(
        patients.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.last_name.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            p.phone?.includes(q)
        )
      );
    }
  }, [searchQuery, patients]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Pacientes
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nombre, email o teléfono..."
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
          <List>
            {filteredPatients.map((patient) => (
              <ListItem
                key={patient.id}
                divider
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => navigate(`/pacientes/${patient.id}`)}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {patient.name[0]}
                    {patient.last_name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${patient.name} ${patient.last_name}`}
                  secondary={
                    <>
                      {patient.phone && <span>{patient.phone}</span>}
                      {patient.email && <span> | {patient.email}</span>}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Fecha de Nacimiento</TableCell>
                  <TableCell>Tipo de Sangre</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/pacientes/${patient.id}`)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                          {patient.name[0]}
                          {patient.last_name[0]}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {patient.name} {patient.last_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.birth_date}</TableCell>
                    <TableCell>{patient.blood_type}</TableCell>
                  </TableRow>
                ))}
                {filteredPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        No se encontraron pacientes
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
