#!/usr/bin/env python3
"""
Backend API Testing Script for Data Analysis System
Tests all backend APIs with sample data as specified in the review request.
"""

import requests
import json
import sys
import os
from typing import Dict, Any

# Get backend URL from environment
BACKEND_URL = "https://mlmodel-improver.preview.emergentagent.com"

# Sample data as specified in the review request
SAMPLE_DATA = {
    "data": [
        {"age": 25, "income": 50000, "score": 85, "category": "A"},
        {"age": 35, "income": 75000, "score": 92, "category": "B"},
        {"age": 45, "income": 90000, "score": 78, "category": "A"},
        {"age": 30, "income": 60000, "score": 88, "category": "C"},
        {"age": 55, "income": 120000, "score": 95, "category": "B"},
        {"age": 28, "income": 55000, "score": 72, "category": "A"},
        {"age": 40, "income": 85000, "score": 81, "category": "B"},
        {"age": 33, "income": 65000, "score": 79, "category": "C"},
        {"age": 50, "income": 110000, "score": 91, "category": "A"},
        {"age": 38, "income": 78000, "score": 86, "category": "B"},
        {"age": 42, "income": 95000, "score": 83, "category": "C"},
        {"age": 29, "income": 58000, "score": 77, "category": "A"},
        {"age": 48, "income": 105000, "score": 89, "category": "B"},
        {"age": 36, "income": 72000, "score": 80, "category": "C"},
        {"age": 52, "income": 115000, "score": 93, "category": "A"}
    ]
}

class BackendTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.results = {}
    
    def log(self, message: str, level: str = "INFO"):
        """Log test messages."""
        print(f"[{level}] {message}")
    
    def test_endpoint(self, method: str, endpoint: str, data: Dict[Any, Any] = None, expected_fields: list = None, timeout: int = 30) -> Dict[str, Any]:
        """Test a single endpoint and return results."""
        url = f"{self.base_url}{endpoint}"
        self.log(f"Testing {method} {endpoint}")
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, timeout=timeout)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, timeout=timeout)
            else:
                return {"success": False, "error": f"Unsupported method: {method}"}
            
            # Check response status
            if response.status_code != 200:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": f"HTTP {response.status_code}: {response.text[:500]}"
                }
            
            # Parse JSON response
            try:
                result = response.json()
            except json.JSONDecodeError as e:
                return {
                    "success": False,
                    "error": f"Invalid JSON response: {str(e)}",
                    "response_text": response.text[:500]
                }
            
            # Check if response indicates success
            if isinstance(result, dict) and result.get("success") is False:
                return {
                    "success": False,
                    "error": result.get("error", "API returned success=False"),
                    "response": result
                }
            
            # Validate expected fields
            if expected_fields and isinstance(result, dict):
                missing_fields = []
                for field in expected_fields:
                    if field not in result:
                        missing_fields.append(field)
                
                if missing_fields:
                    return {
                        "success": False,
                        "error": f"Missing expected fields: {missing_fields}",
                        "response": result
                    }
            
            return {
                "success": True,
                "status_code": response.status_code,
                "response": result,
                "response_size": len(response.text)
            }
            
        except requests.exceptions.Timeout:
            return {"success": False, "error": f"Request timeout ({timeout}s)"}
        except requests.exceptions.ConnectionError as e:
            return {"success": False, "error": f"Connection error: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": f"Unexpected error: {str(e)}"}
    
    def test_health_check(self):
        """Test health check endpoint."""
        self.log("=== Testing Health Check ===")
        result = self.test_endpoint("GET", "/api/health", expected_fields=["status", "services"])
        
        if result["success"]:
            response = result["response"]
            self.log(f"✅ Health check passed - Status: {response.get('status')}")
            services = response.get("services", {})
            for service, status in services.items():
                self.log(f"   - {service}: {status}")
        else:
            self.log(f"❌ Health check failed: {result['error']}", "ERROR")
        
        self.results["health_check"] = result
        return result
    
    def test_eda_api(self):
        """Test EDA (Exploratory Data Analysis) API."""
        self.log("=== Testing EDA API ===")
        
        expected_fields = ["basic_info", "column_info", "numeric_stats", "data_quality_score"]
        result = self.test_endpoint("POST", "/api/analyze/eda", SAMPLE_DATA, expected_fields)
        
        if result["success"]:
            response = result["response"]
            basic_info = response.get("basic_info", {})
            self.log(f"✅ EDA API passed")
            self.log(f"   - Total rows: {basic_info.get('total_rows')}")
            self.log(f"   - Total columns: {basic_info.get('total_columns')}")
            self.log(f"   - Data quality score: {response.get('data_quality_score')}%")
            self.log(f"   - Numeric columns: {len(response.get('numeric_stats', []))}")
        else:
            self.log(f"❌ EDA API failed: {result['error']}", "ERROR")
        
        self.results["eda_api"] = result
        return result
    
    def test_correlation_api(self):
        """Test Correlation API."""
        self.log("=== Testing Correlation API ===")
        
        expected_fields = ["columns", "matrix", "top_correlations"]
        result = self.test_endpoint("POST", "/api/analyze/correlations", SAMPLE_DATA, expected_fields)
        
        if result["success"]:
            response = result["response"]
            self.log(f"✅ Correlation API passed")
            self.log(f"   - Analyzed columns: {len(response.get('columns', []))}")
            self.log(f"   - Top correlations found: {len(response.get('top_correlations', []))}")
            
            # Show top correlation
            top_corrs = response.get("top_correlations", [])
            if top_corrs:
                top = top_corrs[0]
                self.log(f"   - Strongest correlation: {top['column1']} ↔ {top['column2']} ({top['correlation']})")
        else:
            self.log(f"❌ Correlation API failed: {result['error']}", "ERROR")
        
        self.results["correlation_api"] = result
        return result
    
    def test_ml_prediction_api(self):
        """Test ML Prediction API."""
        self.log("=== Testing ML Prediction API ===")
        
        # Test with 'score' as target column
        prediction_data = {
            "data": SAMPLE_DATA["data"],
            "target_column": "score",
            "feature_columns": ["age", "income"],
            "model_type": "auto"
        }
        
        expected_fields = ["model_type", "metrics", "feature_importance"]
        result = self.test_endpoint("POST", "/api/ml/predict", prediction_data, expected_fields)
        
        if result["success"]:
            response = result["response"]
            metrics = response.get("metrics", {})
            self.log(f"✅ ML Prediction API passed")
            self.log(f"   - Model type: {response.get('model_type')}")
            self.log(f"   - Target column: {response.get('target_column')}")
            
            # Show key metric based on model type
            if response.get("model_type") == "regression":
                self.log(f"   - R² Score: {metrics.get('r2_score', 'N/A')}")
            else:
                self.log(f"   - Accuracy: {metrics.get('accuracy', 'N/A')}")
            
            # Show top feature
            features = response.get("feature_importance", [])
            if features:
                top_feature = features[0]
                self.log(f"   - Top feature: {top_feature['feature']} (importance: {top_feature['importance']})")
        else:
            self.log(f"❌ ML Prediction API failed: {result['error']}", "ERROR")
        
        self.results["ml_prediction_api"] = result
        return result
    
    def test_ml_clustering_api(self):
        """Test ML Clustering API."""
        self.log("=== Testing ML Clustering API ===")
        
        clustering_data = {
            "data": SAMPLE_DATA["data"],
            "feature_columns": ["age", "income", "score"],
            "algorithm": "kmeans"
        }
        
        expected_fields = ["n_clusters", "metrics", "cluster_stats", "scatter_data"]
        result = self.test_endpoint("POST", "/api/ml/cluster", clustering_data, expected_fields)
        
        if result["success"]:
            response = result["response"]
            metrics = response.get("metrics", {})
            self.log(f"✅ ML Clustering API passed")
            self.log(f"   - Algorithm: {response.get('algorithm')}")
            self.log(f"   - Number of clusters: {response.get('n_clusters')}")
            self.log(f"   - Silhouette score: {metrics.get('silhouette_score', 'N/A')}")
            
            # Show cluster distribution
            cluster_stats = response.get("cluster_stats", [])
            if cluster_stats:
                self.log(f"   - Cluster sizes: {[c['size'] for c in cluster_stats]}")
        else:
            self.log(f"❌ ML Clustering API failed: {result['error']}", "ERROR")
        
        self.results["ml_clustering_api"] = result
        return result
    
    def test_anomaly_detection_api(self):
        """Test Anomaly Detection API."""
        self.log("=== Testing Anomaly Detection API ===")
        
        anomaly_data = {
            "data": SAMPLE_DATA["data"],
            "feature_columns": ["age", "income", "score"],
            "contamination": 0.1
        }
        
        expected_fields = ["anomaly_count", "severity_summary", "anomalies"]
        result = self.test_endpoint("POST", "/api/ml/anomaly", anomaly_data, expected_fields)
        
        if result["success"]:
            response = result["response"]
            severity = response.get("severity_summary", {})
            self.log(f"✅ Anomaly Detection API passed")
            self.log(f"   - Total records: {response.get('total_records')}")
            self.log(f"   - Anomalies detected: {response.get('anomaly_count')}")
            self.log(f"   - Anomaly rate: {response.get('anomaly_rate')}%")
            
            # Show severity breakdown
            if severity:
                self.log(f"   - Severity breakdown: Critical={severity.get('critical', 0)}, High={severity.get('high', 0)}, Medium={severity.get('medium', 0)}, Low={severity.get('low', 0)}")
        else:
            self.log(f"❌ Anomaly Detection API failed: {result['error']}", "ERROR")
        
        self.results["anomaly_detection_api"] = result
        return result
    
    def test_ai_insights_api(self):
        """Test AI Insights API."""
        self.log("=== Testing AI Insights API ===")
        
        insights_data = {
            "data": SAMPLE_DATA["data"],
            "columns": ["age", "income", "score", "category"],
            "dataset_name": "Sample Customer Data",
            "focus_areas": ["income trends", "score patterns"]
        }
        
        expected_fields = ["insights", "dataset_name"]
        result = self.test_endpoint("POST", "/api/ai/insights", insights_data, expected_fields, timeout=60)
        
        if result["success"]:
            response = result["response"]
            self.log(f"✅ AI Insights API passed")
            self.log(f"   - Dataset: {response.get('dataset_name')}")
            
            insights = response.get("insights", {})
            if isinstance(insights, dict):
                if "key_findings" in insights:
                    self.log(f"   - Key findings: {len(insights.get('key_findings', []))} items")
                if "recommendations" in insights:
                    self.log(f"   - Recommendations: {len(insights.get('recommendations', []))} items")
            else:
                self.log(f"   - Raw insights generated: {len(str(insights))} characters")
        else:
            self.log(f"❌ AI Insights API failed: {result['error']}", "ERROR")
        
        self.results["ai_insights_api"] = result
        return result
    
    def run_all_tests(self):
        """Run all backend API tests."""
        self.log("🚀 Starting Backend API Tests")
        self.log(f"Backend URL: {self.base_url}")
        
        # Test in order of dependencies
        tests = [
            ("Health Check", self.test_health_check),
            ("EDA API", self.test_eda_api),
            ("Correlation API", self.test_correlation_api),
            ("ML Prediction API", self.test_ml_prediction_api),
            ("ML Clustering API", self.test_ml_clustering_api),
            ("Anomaly Detection API", self.test_anomaly_detection_api),
            ("AI Insights API", self.test_ai_insights_api),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if result["success"]:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log(f"❌ {test_name} crashed: {str(e)}", "ERROR")
                failed += 1
            
            self.log("")  # Empty line for readability
        
        # Summary
        self.log("=" * 50)
        self.log(f"🏁 Test Summary: {passed} passed, {failed} failed")
        
        if failed == 0:
            self.log("🎉 All tests passed!")
        else:
            self.log(f"⚠️  {failed} tests failed - check logs above")
        
        return {
            "total_tests": len(tests),
            "passed": passed,
            "failed": failed,
            "success_rate": round((passed / len(tests)) * 100, 1),
            "results": self.results
        }

def main():
    """Main test execution."""
    print("Backend API Testing Script")
    print("=" * 50)
    
    tester = BackendTester(BACKEND_URL)
    summary = tester.run_all_tests()
    
    # Exit with appropriate code
    if summary["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()