export interface FormFieldRecord {
	Form_Field_ID: number;
	Form_ID: number;
	Field_Label: string;
	Field_Order: number;
	Field_Type_ID: number;
	Field_Values: string | null;
	Required: boolean;
	Placement_Required: boolean;
	Alternate_Label: string | null;
	Is_Hidden: boolean;
	Depends_On: number | null;
	Depends_On_Value: string | null;
}


export interface FormField {
	formFieldID: number;
	formID: number;
	fieldLabel: string;
	fieldOrder: number;
	fieldTypeID: number;
	fieldValues: string | null;
	required: boolean;
	placementRequired: boolean;
	alternateLabel: string | null;
	isHidden: boolean;
	dependsOn: number | null;
	dependsOnValue: string | null;
}
