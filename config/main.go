package infraConfig

import (
	"encoding/json"
	"os"
)

type CognitoConfig struct {
	PoolName   string
	ClientName string
}

type LambdaFunction struct {
	Handler      string `json:"handler"`
	Runtime      string `json:"runtime"`
	Version      string `json:"version"`
	UseDatabase  bool   `json:"useDatabase"`
	UseCognito   bool   `json:"useCognito"`
	BaseEndpoint string `json:"baseEndpoint"`
	Name         string `json:"name"`
}

type InfraConfig struct {
	UseCognito     bool             `json:"useCognito"`
	LambdaFunction []LambdaFunction `json:"lambdaFunctions"`
}

func GetCognitoConfig() *CognitoConfig {
	poolName := os.Getenv("COGNITO_POOL_NAME")
	clientName := os.Getenv("COGNITO_CLIENT_NAME")
	return &CognitoConfig{
		PoolName:   poolName,
		ClientName: clientName,
	}
}

func GetInfraConfig() *InfraConfig {
	data, err := os.ReadFile("config.json")
	infraConfig := &InfraConfig{}

	if err != nil {
		panic(err)
	}

	jsonParseErr := json.Unmarshal(data, infraConfig)

	if jsonParseErr != nil {
		panic(err)
	}

	return infraConfig
}
