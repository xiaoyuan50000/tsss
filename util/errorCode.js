class Enum {
    constructor(code, message) {
        this.code = code
        this.message = message
    }
}

class ErrorEnum extends Enum {
    constructor(code, message) {
        super(code, message)
    }

    static NGTS_Trip_ID_RegexErr = new ErrorEnum(10001, 'NGTS_Trip_ID field regular expression error.')
    static ATMs_Reference_ID_RegexErr = new ErrorEnum(10002, 'ATMs_Reference_ID field regular expression error.')
    static Transaction_Type_RegexErr = new ErrorEnum(10003, 'Transaction_Type field regular expression error.')
    static Transaction_Datetime_RegexErr = new ErrorEnum(10004, 'Transaction_Datetime field regular expression error.')
    static Requestor_Name_RegexErr = new ErrorEnum(10005, 'Requestor_Name field regular expression error.')
    static Training_Activity_Name_RegexErr = new ErrorEnum(10006, 'Training_Activity_Name field regular expression error.')
    static ConductingUnit_Code_RegexErr = new ErrorEnum(10007, 'ConductingUnit_Code field regular expression error.')
    static Service_Mode_RegexErr = new ErrorEnum(10008, 'Service_Mode field regular expression error.')
    static Resource_Quantity_RegexErr = new ErrorEnum(10009, 'Resource_Quantity field regular expression error.')
    static Start_DateTime_RegexErr = new ErrorEnum(10010, 'Start_DateTime field regular expression error.')
    static End_DateTime_RegexErr = new ErrorEnum(10011, 'End_DateTime field regular expression error.')
    static POC_Unit_Code_RegexErr = new ErrorEnum(10012, 'POC_Unit_Code field regular expression error.')
    static POC_Name_RegexErr = new ErrorEnum(10013, 'POC_Name field regular expression error.')
    static POC_Mobile_Number_RegexErr = new ErrorEnum(10014, 'POC_Mobile_Number field regular expression error.')
    static Reporting_Location_ID_RegexErr = new ErrorEnum(10015, 'Reporting_Location_ID field regular expression error.')
    static Destination_Location_ID_RegexErr = new ErrorEnum(10016, 'Destination_Location_ID field regular expression error.')
    static Prepark_Quantity_RegexErr = new ErrorEnum(10017, 'Prepark_Quantity field regular expression error.')
    static Prepark_DateTime_RegexErr = new ErrorEnum(10018, 'Prepark_DateTime field regular expression error.')
    static Number_of_Driver_RegexErr = new ErrorEnum(10019, 'Number_of_Driver field regular expression error.')
    static WPM_allocated_number_RegexErr = new ErrorEnum(10020, 'WPM_allocated_number field regular expression error.')
    static Remarks_RegexErr = new ErrorEnum(10021, 'Remarks field regular expression error.')
    static Reason_for_Change_RegexErr = new ErrorEnum(10022, 'Reason_for_Change field regular expression error.')
    static NGTS_Resource_ID_RegexErr = new ErrorEnum(10023, 'NGTS_Resource_ID field regular expression error.')

    static Empty_Err = new ErrorEnum(11001, 'Field empty error.')


    static End_DateTime_Error = new ErrorEnum(20001, 'End_DateTime should be later than Start_DateTime.')
    static Prepark_DateTime_Error = new ErrorEnum(20002, 'Prepark_DateTime should be earlier than Start_DateTime.')
    
    static Reporting_Location_ID_NOTEXIST = new ErrorEnum(30001, 'Reporting_Location_ID does not exist.')
    static Destination_Location_ID_NOTEXIST = new ErrorEnum(30002, 'Destination_Location_ID does not exist.')
    static NGTS_Trip_ID_NOTEXIST = new ErrorEnum(30003, 'NGTS_Trip_ID does not exist.')
    static NGTS_Resource_ID_NOTEXIST = new ErrorEnum(30004, 'NGTS_Resource_ID does not exist.')
    static ATMs_Reference_ID_NOTEXIST = new ErrorEnum(30005, 'ATMs_Reference_ID does not exist.')
    
    static Prepark_Quantity_Error = new ErrorEnum(40001, 'Prepark_Quantity should be less than or equal to Resource_Quantity.')
    static Number_of_Driver_Error = new ErrorEnum(40002, 'Number_of_Driver should be less than or equal to Resource_Quantity.')

    static Task_Already_Start_Error = new ErrorEnum(50001, 'Cannot edit. There are tasks have started.')
    static MVTask_Assigned_Error = new ErrorEnum(50002, 'Cannot edit. MV tasks have assigned.')
    static EndDateTime_Expired_Error = new ErrorEnum(50003, 'Cannot cancel. End Date and Time has expired.')

    static Incorrect_NoOfRecords_Error = new ErrorEnum(60001, 'Incorrect number of footer records.')

}

module.exports.ErrorEnum = ErrorEnum