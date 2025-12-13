/**
 * Parameter direction enum.
 * Indicates whether a parameter is input, output, or both.
 */
export type ParameterDirection = 'Input' | 'Output' | 'InputOutput' | 'ReturnValue';

/**
 * Parameter data type enum.
 * All supported SQL data types for stored procedure parameters.
 */
export type ParameterDataType =
  | 'Unknown'
  | 'String'
  | 'Text'
  | 'Xml'
  | 'Byte'
  | 'Integer16'
  | 'Integer32'
  | 'Integer64'
  | 'Decimal'
  | 'Real'
  | 'Boolean'
  | 'Date'
  | 'Time'
  | 'DateTime'
  | 'Timestamp'
  | 'Binary'
  | 'Password'
  | 'Money'
  | 'Guid'
  | 'Phone'
  | 'Email'
  | 'Variant'
  | 'Separator'
  | 'Image'
  | 'Counter'
  | 'TableName'
  | 'GlobalFilter'
  | 'TimeZone'
  | 'Locale'
  | 'LargeString'
  | 'Url'
  | 'Strings'
  | 'Integers'
  | 'Color'
  | 'SecretKey';

/**
 * ParameterInfo - Metadata about a stored procedure parameter.
 * Uses camelCase internally; API returns PascalCase.
 *
 * API returns: Name, Direction, DataType, Size
 */
export interface ParameterInfo {
  /** Parameter name (e.g., "@ContactId"). */
  name: string;
  /** Parameter direction (Input, Output, etc.). */
  direction: ParameterDirection;
  /** SQL data type. */
  dataType: ParameterDataType;
  /** Maximum length/size. */
  size: number;
}

/**
 * ProcedureInfo - Metadata about a stored procedure.
 * Returned from GET /procs endpoint.
 * Uses camelCase internally; API returns PascalCase.
 *
 * API returns: Name, Parameters
 */
export interface ProcedureInfo {
  /** Procedure name (e.g., "api_Custom_GetContacts"). */
  name: string;
  /** Array of parameter definitions. */
  parameters: ParameterInfo[];
}

/**
 * ProcedureInput - Input parameters for executing a stored procedure.
 * Keys should match parameter names with @ prefix.
 *
 * Example: { "@SelectionID": 26918, "@StartDate": "2024-01-01" }
 */
export interface ProcedureInput {
  [parameterName: string]: string | number | boolean | null;
}
