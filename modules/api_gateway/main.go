package api_gateway

import (
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/apigatewayauthorizer"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/apigatewayrestapi"
)

type ApiGatewayConfig struct {
	UseCognito bool
	CognitoArn *string
}

type ApiGateway struct {
	RestApi    apigatewayrestapi.ApiGatewayRestApi
	Authorizer apigatewayauthorizer.ApiGatewayAuthorizer
}

func CreateApiAuthorizer(scope constructs.Construct, id string, config *apigatewayauthorizer.ApiGatewayAuthorizerConfig) apigatewayauthorizer.ApiGatewayAuthorizer {
	return apigatewayauthorizer.NewApiGatewayAuthorizer(scope, &id, config)
}

func NewApiGateway(scope constructs.Construct, id string, config *ApiGatewayConfig) *ApiGateway {
	restApi := apigatewayrestapi.NewApiGatewayRestApi(scope, &id, &apigatewayrestapi.ApiGatewayRestApiConfig{
		Name: jsii.String("api"),
	})

	var authorizer apigatewayauthorizer.ApiGatewayAuthorizer = nil

	if config.UseCognito {
		authorizer = CreateApiAuthorizer(scope, id+"authorizer", &apigatewayauthorizer.ApiGatewayAuthorizerConfig{
			Name:         jsii.String("cognito-authorizer"),
			Type:         jsii.String("COGNITO_USER_POOLS"),
			ProviderArns: &[]*string{config.CognitoArn},
			RestApiId:    restApi.Id(),
		})
	}

	return &ApiGateway{
		RestApi:    restApi,
		Authorizer: authorizer,
	}

}
