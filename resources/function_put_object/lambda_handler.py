import boto3, datetime, json,os, logging
from botocore.exceptions import ClientError
dt = datetime.datetime.today()

logger = logging.getLogger()

s3 = boto3.resource('s3')
bucket = s3.Bucket(os.environ.get('BUCKETNAME'))

def lambda_handler(event, context):

    body =json.loads(event["body"])
    accountid = body["order"]["accountid"]      
    message = json.dumps(body)
    data = message.encode("utf-8")

    period = str(dt.year) + "/" + str(dt.month)
    accountid = body['order']['accountid']

    key = period + '/' + accountid + '.json'

    try:
        bucket.put_object(
            ContentType='application/json',
            Key=key,
            Body=data,
            Metadata={'accountid':accountid}
        )
        logger.info("PutObject to bucket %s.",bucket)
        return {
            'statusCode': 200,
            'headers': {
                "Content-Type": 'application/json',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": 'Content-Type,X-Amz-Date,X-Api-Key',
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            'body': json.dumps("success")
        }
    except ClientError:
        logger.exception("Couldn't PutObject to bucket %s.",bucket)
        raise