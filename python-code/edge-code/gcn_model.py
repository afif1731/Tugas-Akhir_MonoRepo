import torch
import torch.nn as nn
import numpy as np

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def get_adjacency_matrix():
  edges = [
    (0, 1), (0, 2), (1, 3), (2, 4),
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),
    (11, 12), (5, 11), (6, 12),
    (11, 13), (13, 15), (12, 14), (14, 16)
  ]
  A = np.zeros((17, 17))
  for i, j in edges:
    A[i, j] = 1
    A[j, i] = 1
  A = A + np.eye(17)

  # Normalize
  D = np.diag(np.sum(A, axis=1) ** (-0.5))
  A_norm = np.dot(np.dot(D, A), D)
  return torch.tensor(A_norm, dtype=torch.float32).to(device)

A = get_adjacency_matrix()

class GraphConv(nn.Module):
  def __init__(self, in_channels, out_channels):
    super().__init__()
    self.conv = nn.Conv2d(in_channels, out_channels, kernel_size=1)
  def forward(self, x, A):
    x = self.conv(x)
    return torch.einsum('nctv,vw->nctw', x, A)
  
class GCN_LSTM(nn.Module):
  def __init__(self, num_classes=5, in_channels=3, hidden_gcn=64, hidden_lstm=128, lstm_layers=2, dropout=0.5):
    super().__init__()
    # Spatial Extraction
    self.gcn1 = GraphConv(in_channels, hidden_gcn)
    self.gcn2 = GraphConv(hidden_gcn, hidden_gcn)
    self.relu = nn.ReLU()

    # LSTM Block
    # input: (Batch, Sequence, Feature)
    self.lstm = nn.LSTM(
      input_size=hidden_gcn,
      hidden_size=hidden_lstm,
      num_layers=lstm_layers,
      batch_first=True,
      dropout=dropout if lstm_layers > 1 else 0.0
    )

    self.dropout = nn.Dropout(dropout)
    self.fc = nn.Linear(hidden_lstm, num_classes)

  def forward(self, x, A):
    # input x: (Batch, Channels, Time_frames, Vertices_joints) -> (N, 3, 100, 17)

    # 1. Spatial GCN Processing
    x = self.relu(self.gcn1(x, A))
    x = self.relu(self.gcn2(x, A)) # Shape: (N, hidden_gcn, 100, 17)

    # 2. Spatial Pooling
    x = x.mean(dim=-1) # Shape: (N, hidden_gcn, 100)

    # 3. LSTM Preparation (Transpose)
    x = x.permute(0, 2, 1) # Shape: (Batch, Time_frames, Features) -> (N, 100, hidden_gcn)

    # 4. Temporal LSTM Processing
    lstm_out, (hn, cn) = self.lstm(x) # lstm_out shape: (N, 100, hidden_lstm)

    # 5. Final Classification (Picked from the last frame)
    last_frame_out = lstm_out[:, -1, :] # Shape: (N, hidden_lstm)

    out = self.dropout(last_frame_out)
    out = self.fc(out)
    return out