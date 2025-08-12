/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Assignment } from './Assignment';
import type { ConstraintSettings } from './ConstraintSettings';
import type { HardSoftScore } from './HardSoftScore';
import type { Person } from './Person';
export type EventAssignmentSolution = {
    personList?: Array<Person>;
    assignmentList?: Array<Assignment>;
    score?: HardSoftScore;
    constraintSettings?: ConstraintSettings;
};

