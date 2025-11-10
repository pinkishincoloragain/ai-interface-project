# AWS Resources - SeamlessAI Development Environment

## 1. Lambda Function

- **Service**: AWS Lambda
- **Function Name**: seamlessai-dev-api
- **Console URL**: https://ap-northeast-2.console.aws.amazon.com/lambda/home?region=ap-northeast-2#/functions/seamlessai-dev-api
- **Monitor**: CloudWatch logs, metrics, and invocations

## 2. API Gateway

- **Service**: API Gateway
- **API ID**: th701au4k3
- **Console URL**: https://ap-northeast-2.console.aws.amazon.com/apigateway/home?region=ap-northeast-2#/apis/th701au4k3
- **Test URL**: https://th701au4k3.execute-api.ap-northeast-2.amazonaws.com/dev

## 3. CloudFront Distribution

- **Service**: CloudFront
- **Distribution ID**: E3CEPVGGSQ4KSB
- **Console URL**: https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/E3CEPVGGSQ4KSB
- **Website URL**: https://d1wlvmesqg44op.cloudfront.net

## 4. DynamoDB Tables

- **Service**: DynamoDB
- **Tables**: seamlessai-dev-users, seamlessai-dev-threads, seamlessai-dev-messages
- **Console URL**: https://ap-northeast-2.console.aws.amazon.com/dynamodbv2/home?region=ap-northeast-2#tables

## 5. CloudWatch Logs

- **Service**: CloudWatch
- **Log Group**: /aws/lambda/seamlessai-dev-api
- **Console URL**: https://ap-northeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fseamlessai-dev-api

## 6. Cognito User Pool

- **Service**: Cognito
- **User Pool ID**: ap-northeast-2_SIsYHaP1z
- **Console URL**: https://ap-northeast-2.console.aws.amazon.com/cognito/v2/idp/user-pools/ap-northeast-2_SIsYHaP1z

## 7. Secrets Manager

- **Service**: Secrets Manager
- **Secret Name**: seamlessai-dev/api-keys
- **Console URL**: https://ap-northeast-2.console.aws.amazon.com/secretsmanager/home?region=ap-northeast-2#!/secret?name=seamlessai-dev%2Fapi-keys

## 📊 Quick Monitoring Tips

- **Lambda logs**: CloudWatch → Log groups → /aws/lambda/seamlessai-dev-api
- **API Gateway metrics**: API Gateway console → th701au4k3 → Monitoring
- **Real-time monitoring**: CloudWatch → Dashboards (create custom dashboard)
