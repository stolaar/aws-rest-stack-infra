package main

import (
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	"github.com/hashicorp/terraform-cdk-go/cdktf"
	infraConfig "github.com/stolaar/aws-infra/config"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/provider"
	"github.com/stolaar/aws-infra/modules/api_gateway"
	"github.com/stolaar/aws-infra/modules/cognito"
	"github.com/stolaar/aws-infra/modules/lambda"
)

func AWSRestStack(scope constructs.Construct, id string) cdktf.TerraformStack {
	stack := cdktf.NewTerraformStack(scope, &id)

	provider.NewAwsProvider(stack, jsii.String("aws"), &provider.AwsProviderConfig{
		Region: jsii.String("eu-central-1"),
	})

	config := infraConfig.GetInfraConfig()

	var cognitoResource *cognito.Stack = nil

	if config.UseCognito {
		cognitoResource = cognito.NewCognito(stack, id+"-cognito")
	}

	apiGateway := api_gateway.NewApiGateway(stack, id+"-api-gateway", &api_gateway.ApiGatewayConfig{
		CognitoArn: cognitoResource.Arn(),
		UseCognito: config.UseCognito,
	})

	for _, lambdaFunction := range config.LambdaFunction {
		lambda.NewLambda(stack, id+lambdaFunction.Name, &lambda.NewLambdaConfig{
			LambdaFunction:      &lambdaFunction,
			RestApiExecutionArn: apiGateway.RestApi.ExecutionArn(),
		})
	}

	return stack
}

func main() {
	app := cdktf.NewApp(nil)

	AWSRestStack(app, "aws-rest-stack")

	app.Synth()
}
