/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Manpower } from '../models/Manpower';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ManpowerControllerService {
    /**
     * @param id
     * @returns Manpower OK
     * @throws ApiError
     */
    public static getById(
        id: string,
    ): CancelablePromise<Manpower> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/manpower/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns Manpower OK
     * @throws ApiError
     */
    public static update(
        id: string,
        requestBody: Manpower,
    ): CancelablePromise<Manpower> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/manpower/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns any OK
     * @throws ApiError
     */
    public static delete(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/manpower/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns Manpower OK
     * @throws ApiError
     */
    public static getAll(): CancelablePromise<Array<Manpower>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/manpower',
        });
    }
    /**
     * @param requestBody
     * @returns Manpower OK
     * @throws ApiError
     */
    public static create(
        requestBody: Manpower,
    ): CancelablePromise<Manpower> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/manpower',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns Manpower OK
     * @throws ApiError
     */
    public static createBulk(
        requestBody: Array<Manpower>,
    ): CancelablePromise<Array<Manpower>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/manpower/bulk',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
