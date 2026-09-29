public class HICIdempotency {
    public static String keyFor(String sourceRecordId, Datetime submittedAt) {
        String basis = sourceRecordId + '|' + submittedAt.formatGmt('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
        Blob digest = Crypto.generateDigest('SHA-256', Blob.valueOf(basis));
        return EncodingUtil.convertToHex(digest);
    }
}
