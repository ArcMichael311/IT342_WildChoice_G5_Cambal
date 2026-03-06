package edu.cit.cambal.wildchoice.controller;

import edu.cit.cambal.wildchoice.dto.AuthResponse;
import edu.cit.cambal.wildchoice.dto.LoginRequest;
import edu.cit.cambal.wildchoice.dto.RegisterRequest;
import edu.cit.cambal.wildchoice.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    /**
     * Register a new user
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerUser(@RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        
        if (response.getToken() == null) {
            return ResponseEntity.badRequest().body(response);
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * Login user
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginUser(@RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        
        if (response.getToken() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Logout user
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logoutUser(@RequestHeader("Authorization") String authHeader) {
        String token = null;
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        
        Map<String, String> response = authService.logout(token);
        
        if (response.get("message").equals("Invalid token")) {
            return ResponseEntity.badRequest().body(response);
        }
        
        return ResponseEntity.ok(response);
    }
}
