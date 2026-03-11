import torch
import torch.nn as nn

class YOLOPoseVideoClassifier(nn.Module):
    def __init__(self, num_classes=3, num_frames=16, num_keypoints=17):
        super(YOLOPoseVideoClassifier, self).__init__()
        
        self.num_frames = num_frames
        self.num_keypoints = num_keypoints
        
        # Input: (batch, num_frames, num_keypoints, 3)
        input_size = num_keypoints * 3
        
        # Spatial feature extraction
        self.spatial_encoder = nn.Sequential(
            nn.Linear(input_size, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3)
        )
        
        # Temporal modeling with GRU
        self.gru = nn.GRU(input_size=128, hidden_size=256, num_layers=2, 
                        batch_first=True, dropout=0.3, bidirectional=True)
        
        # Attention mechanism
        self.attention = nn.Sequential(
            nn.Linear(512, 128),
            nn.Tanh(),
            nn.Linear(128, 1)
        )
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, num_classes)
        )
    
    def forward(self, x):
        batch_size = x.size(0)
        num_frames = x.size(1)
        
        # Flatten keypoints
        x = x.view(batch_size * num_frames, -1)
        
        # Spatial encoding
        x = self.spatial_encoder(x)
        x = x.view(batch_size, num_frames, -1)
        
        # Temporal modeling
        gru_out, _ = self.gru(x)
        
        # Attention mechanism
        attention_weights = self.attention(gru_out)
        attention_weights = torch.softmax(attention_weights, dim=1)
        
        # Weighted sum
        context_vector = torch.sum(gru_out * attention_weights, dim=1)
        
        # Classification
        output = self.classifier(context_vector)
        
        return output