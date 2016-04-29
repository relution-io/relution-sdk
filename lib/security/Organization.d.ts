export interface Organization {
    uuid: string;
    createdUser: string;
    createdDate: Date;
    modifiedUser: string;
    modifiedDate: Date;
    version: number;
    name: string;
    uniqueName: string;
    propertyMap: any;
}
