module.exports.CSV = {
    Separator: '|',
    RowDelimiter: '\r\n'
}

module.exports.Prefix = {
    Header: 'HH',
    Footer: 'FF',
};

module.exports.NGTSFilenamePrefix = {
    NGTS_VEHICLE: 'NGTS_VEHICLE_',
    NGTS_QNC: 'NGTS_QNC_',
    NGTS_LOCATION: 'NGTS_LOCATION_',
    NGTS_REQ_ACK: 'NGTS_REQ_ACK_',
    NGTS_RESP: 'NGTS_RESP_',
    NGTS_REQ: 'NGTS_REQ_',
}

module.exports.RegexContent = {
    NGTS_Trip_ID: new RegExp(/^[\w-\/]{0,23}$/),
    ATMs_Reference_ID: new RegExp(/^[\w]{0}$|^[\d]{1,19}-[\d]{1,3}$/),
    Transaction_Type: new RegExp(/^[NCU]$/),
    Transaction_Datetime: new RegExp(/^[\d]{14}$/),
    Requestor_Name: new RegExp(/^[\[\]\^$.|?*+(){}\w\s:;",\/'~`!@#%&-_=<>]{0,66}$/),
    Training_Activity_Name: new RegExp(/^[\[\]\^$.|?*+(){}\w\s:;",\/'~`!@#%&-_=<>]{0,511}$/),
    ConductingUnit_Code: new RegExp(/^[\w ]{0,5}$/),
    Service_Mode: new RegExp(/^[\w,.?()-\s]{0,50}$/),
    Purpose: new RegExp(/^[\w,.?()-\s]{0,50}$/),
    NGTS_Resource_ID: new RegExp(/^[\d]{0,20}/),
    Resource_Quantity: new RegExp(/^[\d]{0,4}$/),
    Start_DateTime: new RegExp(/^[\d]{14}$/),
    End_DateTime: new RegExp(/^[\d]{14}$/),
    POC_Unit_Code: new RegExp(/^[\w ]{0,5}$/),
    POC_Name: new RegExp(/^[\[\]\^$.|?*+(){}\w\s:;",\/'~`!@#%&-_=<>]{0,66}$/),
    POC_Mobile_Number: new RegExp(/^8\d{7}|9\d{7}$/),
    Reporting_Location_ID: new RegExp(/^[\d]{0,20}/),
    Destination_Location_ID: new RegExp(/^[\d]{0,20}/),
    Prepark_Quantity: new RegExp(/^[\d]{0,4}$/),
    Prepark_DateTime: new RegExp(/^\d{14}$|^$/),
    Number_of_Driver: new RegExp(/^[\d]{0,4}$/),
    WPM_allocated_number: new RegExp(/^[\d]{0,4}$/),
    Remarks: new RegExp(/^[\w.,? ]{0,255}$/),
    Reason_for_Change: new RegExp(/^[\w.,? ]{0,255}$/),
}

module.exports.ChargeType = {
    HOUR: "Hour",
    TRIP: "Trip",
    OTBLOCK: "Block_OTBlock",
    OTHOURLY: "Block_OTHourly",
    MIX: "Mix",
    DAILY: "Daily",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    YEARLY: "Yearly",
    DAILYTRIP: "DailyTrip",
    BLOCKDAILY: "Block_Daily",
    BLOCKDAILY_1: "Block_Daily_1",
    BLOCKDAILY_2: "Block_Daily_2",
    BLOCKDAILYMIX: "Block_Mix",
    SINGLE: "Single",
    ROUND: "Round",
}