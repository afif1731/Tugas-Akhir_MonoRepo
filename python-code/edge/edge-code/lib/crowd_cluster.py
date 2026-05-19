import math
import numpy as np

def calculate_distance(p1, p2):
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

def spatial_clustering(people, max_distance=200):
    """
    Mengelompokkan orang berdasarkan jarak Euclidean antara koordinat pelvis.
    people: list of dict, misal: [{"pelvis": [x, y], ...}, ...]
    Mengembalikan list of clusters, di mana tiap cluster adalah list of dicts.
    """
    if not people:
        return []

    clusters = []
    visited = set()
    
    for i in range(len(people)):
        if i in visited:
            continue
            
        current_cluster = [people[i]]
        visited.add(i)
        
        while True:
            added = False
            for j in range(len(people)):
                if j in visited:
                    continue
                
                for member in current_cluster:
                    dist = calculate_distance(people[j]["pelvis"], member["pelvis"])
                    if dist <= max_distance:
                        current_cluster.append(people[j])
                        visited.add(j)
                        added = True
                        break 
            if not added:
                break
                
        clusters.append(current_cluster)
        
    return clusters

class CentroidTracker:
    def __init__(self, max_disappeared=50, max_distance=300):
        self.next_object_id = 0
        self.objects = {}
        self.disappeared = {}

        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid):
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.next_object_id += 1
        return self.next_object_id - 1

    def deregister(self, object_id):
        del self.objects[object_id]
        del self.disappeared[object_id]

    def update(self, cluster_centroids):
        """
        cluster_centroids: list of [x, y]
        Mengembalikan dict mapping dari index array cluster_centroids ke object_id
        """
        if len(cluster_centroids) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return {}

        if len(self.objects) == 0:
            tracked = {}
            for i in range(len(cluster_centroids)):
                tracked[i] = self.register(cluster_centroids[i])
            return tracked

        object_ids = list(self.objects.keys())
        object_centroids = list(self.objects.values())

        D = np.zeros((len(object_centroids), len(cluster_centroids)))
        for i, oc in enumerate(object_centroids):
            for j, cc in enumerate(cluster_centroids):
                D[i, j] = calculate_distance(oc, cc)

        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        used_rows = set()
        used_cols = set()
        
        tracked = {}

        for row, col in zip(rows, cols):
            if row in used_rows or col in used_cols:
                continue

            if D[row, col] > self.max_distance:
                continue

            object_id = object_ids[row]
            self.objects[object_id] = cluster_centroids[col]
            self.disappeared[object_id] = 0
            
            tracked[col] = object_id

            used_rows.add(row)
            used_cols.add(col)

        unused_rows = set(range(0, D.shape[0])).difference(used_rows)
        unused_cols = set(range(0, D.shape[1])).difference(used_cols)

        for row in unused_rows:
            object_id = object_ids[row]
            self.disappeared[object_id] += 1
            if self.disappeared[object_id] > self.max_disappeared:
                self.deregister(object_id)

        for col in unused_cols:
            tracked[col] = self.register(cluster_centroids[col])

        return tracked
