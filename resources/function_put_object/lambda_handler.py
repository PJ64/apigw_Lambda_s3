import boto3
import json
import logging
import os
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(os.environ.get('BUCKETNAME'))
    
    body =json.loads(event["body"])
    orderid = body["order"]["orderid"]      
    message = json.dumps(body)
    data = message.encode("utf-8")
    path = 'orderid_' + orderid + '.json'

    try:
        bucket.put_object(
            ContentType='application/json',
            Key=path,
            Body=data,
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