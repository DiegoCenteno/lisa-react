import { memo } from 'react';
import type { PatientReportRecord } from '../../api/consultationService';
import PatientGeneticReportBuilder from './PatientGeneticReportBuilder';

interface Props {
  reportId: number;
  onClose: () => void;
  onSaved?: (report: PatientReportRecord<any>) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  startInEditMode?: boolean;
}

function PatientStructuralReportBuilder(props: Props) {
  return <PatientGeneticReportBuilder {...props} variant="structural" />;
}

export default memo(PatientStructuralReportBuilder);
