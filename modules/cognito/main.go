package cognito

import (
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	"github.com/stolaar/aws-infra/config"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/cognitouserpool"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/cognitouserpoolclient"
)

type Stack struct {
	cognitouserpool.CognitoUserPool
	cognitouserpoolclient.CognitoUserPoolClient
}

func NewCognito(scope constructs.Construct, id string) *Stack {
	config := infraConfig.GetCognitoConfig()

	userPool := cognitouserpool.NewCognitoUserPool(scope, &id, &cognitouserpool.CognitoUserPoolConfig{
		Name:            jsii.String(config.PoolName),
		AliasAttributes: &[]*string{jsii.String("email")},
		AccountRecoverySetting: &cognitouserpool.CognitoUserPoolAccountRecoverySetting{
			RecoveryMechanism: &cognitouserpool.CognitoUserPoolAccountRecoverySettingRecoveryMechanism{
				Name:     jsii.String("verified_email"),
				Priority: jsii.Number(1),
			},
		},
		MfaConfiguration: jsii.String("OFF"),
	})

	poolClient := cognitouserpoolclient.NewCognitoUserPoolClient(scope, jsii.String("example-client"), &cognitouserpoolclient.CognitoUserPoolClientConfig{
		ExplicitAuthFlows: &[]*string{jsii.String("ALLOW_USER_PASSWORD_AUTH"), jsii.String("ALLOW_REFRESH_TOKEN_AUTH"), jsii.String("ALLOW_USER_SRP_AUTH")},
		UserPoolId:        userPool.Id(),
		Name:              jsii.String(config.ClientName),
	})

	return &Stack{
		CognitoUserPool:       userPool,
		CognitoUserPoolClient: poolClient,
	}
}
