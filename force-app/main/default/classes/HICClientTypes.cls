public class HICClientTypes {
    public class HICRequest {
        public String kind;
        public String sourceRecordId;
        public Datetime submittedAt;
        public String bodyJson;
    }
    public class HICResponse {
        public Boolean success;
        public Integer httpStatus;
        public String bodyJson;
        public String errorMessage;
    }
}
