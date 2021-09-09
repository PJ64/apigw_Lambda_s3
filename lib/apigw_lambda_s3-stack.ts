import * as cdk from '@aws-cdk/core';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-iam';
import { Runtime, Code, Function } from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import { LambdaIntegration, RestApi, Cors} from '@aws-cdk/aws-apigateway';

export class ApigwLambdaS3Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3_bucket = new Bucket(this, "S3Bucket" ,{
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })
    
    //Setup IAM security for Lambda
    const lambda_service_role_put = new Role(this, "IamRole-put",{
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        roleName: "apigw_lambda_s3_put"
    });

    const lambda_service_role_get = new Role(this, "IamRole-get",{
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      roleName: "apigw_lambda_s3_get"
    });

    lambda_service_role_put.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    lambda_service_role_get.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));

    lambda_service_role_put.addToPolicy(new PolicyStatement({
      resources: [s3_bucket.bucketArn, s3_bucket.bucketArn + "/*"],
      actions: ['s3:PutObject'],
    }));
    lambda_service_role_get.addToPolicy(new PolicyStatement({
      resources: [s3_bucket.bucketArn, s3_bucket.bucketArn + "/*"],
      actions: ['s3:GetObject'],
    }));

    //Create 2 Lambda function. One for put object and pre-signed url
    const lambda_put_s3_object = new Function(this, "PutObjectLambdaFunction",{
      runtime: Runtime.PYTHON_3_7,
      handler: "lambda_handler.lambda_handler",
      code: Code.fromAsset("resources/function_put_object"),
      functionName: "apigw_lambda_s3_put",
      role: lambda_service_role_put,
      environment: {
        'BUCKETNAME': s3_bucket.bucketName
      }
    });
    
    const lambda_get_presigned_url = new Function(this, "GetUrlLambdaFunction",{
      runtime: Runtime.PYTHON_3_7,
      handler: "lambda_handler.lambda_handler",
      code: Code.fromAsset("resources/function_get_presigned_url"),
      functionName: "apigw_lambda_s3_get_url",
      role: lambda_service_role_get,
      environment: {
        'BUCKETNAME': s3_bucket.bucketName
      }
    });

    //Create REST Api and integrate the Lambda function
    var api = new RestApi(this, "InvoiceApi",{
      restApiName: "apigateway_lambda_s3",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS}
    });

    var function_api_integration = new LambdaIntegration(lambda_put_s3_object, {
      requestTemplates: {
            ["application/json"]: "{ \"statusCode\": \"200\" }"
        }
    });

    var function_get_integration = new LambdaIntegration(lambda_get_presigned_url);

    var apiresource = api.root.addResource("invoice");
    apiresource.addMethod("POST", function_api_integration);
    apiresource.addMethod("GET", function_get_integration);
  }
}
