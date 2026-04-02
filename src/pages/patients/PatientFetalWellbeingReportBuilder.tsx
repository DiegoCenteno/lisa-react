import { memo } from 'react';
import PatientGeneticReportBuilder from './PatientGeneticReportBuilder';

type PatientGeneticReportBuilderProps = Parameters<typeof PatientGeneticReportBuilder>[0];

function PatientFetalWellbeingReportBuilder(props: PatientGeneticReportBuilderProps) {
  return <PatientGeneticReportBuilder {...props} variant="wellbeing" />;
}

export default memo(PatientFetalWellbeingReportBuilder);
