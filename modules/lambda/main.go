package lambda

import (
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	infraConfig "github.com/stolaar/aws-infra/config"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/iamrole"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/iamrolepolicyattachment"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/lambdafunction"
	"github.com/stolaar/aws-infra/generated/hashicorp/aws/lambdapermission"
)

type NewLambdaConfig struct {
	*infraConfig.LambdaFunction
	RestApiExecutionArn *string
}

func NewLambda(scope constructs.Construct, id string, config *NewLambdaConfig) {
	s3Bucket := config.Name + "-bucket"
	rolePolicy := `{
		Version: "2012-10-17",
		Statement: [
			{
    	  		Action: "sts:AssumeRole",
    	  		Principal: {
    	    		Service: "lambda.amazonaws.com",
    	  		},
    	  		Effect: "Allow",
    	  		Sid: "",
    		},
  		],
	}`

	role := iamrole.NewIamRole(scope, jsii.String(id+"-role"), &iamrole.IamRoleConfig{
		Name:             jsii.String(config.Name + "-role"),
		AssumeRolePolicy: jsii.String(rolePolicy),
	})

	lambdaFunction := lambdafunction.NewLambdaFunction(scope, &id, &lambdafunction.LambdaFunctionConfig{
		FunctionName:   jsii.String(config.Name),
		S3Bucket:       jsii.String(s3Bucket),
		S3Key:          jsii.String(config.Version + "/package.zip"),
		Handler:        jsii.String(config.Handler),
		Runtime:        jsii.String(config.Runtime),
		SourceCodeHash: jsii.String(config.Version),
		Role:           role.Arn(),
	})

	iamrolepolicyattachment.NewIamRolePolicyAttachment(scope, jsii.String(id+"-execution-role"), &iamrolepolicyattachment.IamRolePolicyAttachmentConfig{
		PolicyArn: jsii.String("arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"),
		Role:      role.Name(),
	})

	lambdapermission.NewLambdaPermission(scope, jsii.String(id+"invocation-permission"), &lambdapermission.LambdaPermissionConfig{
		Action:       jsii.String("lambda:InvokeFunction"),
		FunctionName: lambdaFunction.FunctionName(),
		Principal:    jsii.String("apigateway.amazonaws.com"),
		SourceArn:    config.RestApiExecutionArn,
	})
}
