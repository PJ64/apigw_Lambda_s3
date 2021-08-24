import * as cdk from '@aws-cdk/core';
import { Role, ServicePrincipal, ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-iam';
import { Runtime, Code, Function } from '@aws-cdk/aws-lambda';
import { Bucket } from '@aws-cdk/aws-s3';
import { LambdaIntegration, RestApi, Cors} from '@aws-cdk/aws-apigateway';

export class ApigwLambdaS3Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3_bucket = new Bucket(this, "S3Bucket" )
    
    //Setup IAM security for Lambda
    const lambda_service_role = new Role(this, "IamRole",{
        assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        roleName: "apigw_lambda_s3"
    });

    lambda_service_role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
    
    lambda_service_role.addToPolicy(new PolicyStatement({
      resources: [s3_bucket.bucketArn],
      actions: ['s3:PutObject'],
    }));

    //Create 2 Lambda function. One for put object and pre-signed url
    const lambda_put_s3_object = new Function(this, "PutObjectLambdaFunction",{
      runtime: Runtime.PYTHON_3_7,
      handler: "lambda_handler.lambda_handler",
      code: Code.fromAsset("resources/function_put_object"),
      functionName: "put_s3_object",
      role: lambda_service_role,
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

    var apiresource = api.root.addResource("invoice");
    apiresource.addMethod("POST", function_api_integration);
    
  }
}
