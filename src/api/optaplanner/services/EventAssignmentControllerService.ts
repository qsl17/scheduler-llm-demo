/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EventAssignmentSolution } from '../models/EventAssignmentSolution';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class EventAssignmentControllerService {
    /**
     * @param requestBody
     * @returns EventAssignmentSolution OK
     * @throws ApiError
     */
    public static solve(
        requestBody: EventAssignmentSolution,
    ): CancelablePromise<EventAssignmentSolution> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/assignment/solve',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
